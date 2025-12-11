# analyze-session.ps1 - Analyze a Claude session for cost/duration/tokens
# Uses ccusage for accurate cost, parses transcript for per-todo timing
# Option B: Accurate per-todo tokens by summing entries within time windows

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$SessionId,

    [Parameter(Mandatory=$false)]
    [string]$TranscriptPath  # Optional - will derive from SessionId if not provided
)

$ErrorActionPreference = "Stop"

# Get ccusage data
Write-Host "Getting cost data from ccusage..."
$ccusageOutput = npx ccusage@latest session -i $SessionId --json 2>&1

try {
    $ccusageData = $ccusageOutput | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse ccusage output: $ccusageOutput"
    exit 1
}

$totalCost = $ccusageData.totalCost
$totalTokens = $ccusageData.totalTokens
$entries = $ccusageData.entries

# Pricing per million tokens (from https://platform.claude.com/docs/en/about-claude/pricing)
$PRICING = @{
    "claude-opus-4-5-20251101" = @{
        input = 5.0; output = 25.0; cacheWrite = 6.25; cacheRead = 0.50
    }
    "claude-sonnet-4-5-20250929" = @{
        input = 3.0; output = 15.0; cacheWrite = 3.75; cacheRead = 0.30
    }
    "claude-haiku-4-5-20251001" = @{
        input = 1.0; output = 5.0; cacheWrite = 1.25; cacheRead = 0.10
    }
    # Fallback for unknown models (use Opus pricing as conservative estimate)
    "default" = @{
        input = 5.0; output = 25.0; cacheWrite = 6.25; cacheRead = 0.50
    }
}

# Helper function to calculate cost for a single entry
function Get-EntryCost {
    param($Entry)

    $model = $Entry.model
    $prices = if ($PRICING.ContainsKey($model)) { $PRICING[$model] } else { $PRICING["default"] }

    $cost = 0
    if ($Entry.inputTokens) { $cost += ($Entry.inputTokens / 1000000) * $prices.input }
    if ($Entry.outputTokens) { $cost += ($Entry.outputTokens / 1000000) * $prices.output }
    if ($Entry.cacheCreationTokens) { $cost += ($Entry.cacheCreationTokens / 1000000) * $prices.cacheWrite }
    if ($Entry.cacheReadTokens) { $cost += ($Entry.cacheReadTokens / 1000000) * $prices.cacheRead }

    return $cost
}

# Helper function to sum tokens and cost from entries within a time window
# Returns breakdown of regular vs cached tokens and costs
function Get-TokensInWindow {
    param(
        [array]$Entries,
        [DateTime]$StartTime,
        [DateTime]$EndTime
    )

    $regularTokens = 0
    $cachedTokens = 0
    $regularCost = 0
    $cachedCost = 0

    foreach ($entry in $Entries) {
        $entryTime = [DateTime]::Parse($entry.timestamp)
        if ($entryTime -ge $StartTime -and $entryTime -le $EndTime) {
            $model = $entry.model
            $prices = if ($PRICING.ContainsKey($model)) { $PRICING[$model] } else { $PRICING["default"] }

            # Regular tokens: input + output
            if ($entry.inputTokens) {
                $regularTokens += $entry.inputTokens
                $regularCost += ($entry.inputTokens / 1000000) * $prices.input
            }
            if ($entry.outputTokens) {
                $regularTokens += $entry.outputTokens
                $regularCost += ($entry.outputTokens / 1000000) * $prices.output
            }

            # Cached tokens: cacheWrite + cacheRead
            if ($entry.cacheCreationTokens) {
                $cachedTokens += $entry.cacheCreationTokens
                $cachedCost += ($entry.cacheCreationTokens / 1000000) * $prices.cacheWrite
            }
            if ($entry.cacheReadTokens) {
                $cachedTokens += $entry.cacheReadTokens
                $cachedCost += ($entry.cacheReadTokens / 1000000) * $prices.cacheRead
            }
        }
    }

    $totalTokens = $regularTokens + $cachedTokens
    $totalCost = $regularCost + $cachedCost

    return @{
        tokens = $totalTokens
        cost = $totalCost
        regularTokens = $regularTokens
        regularCost = $regularCost
        cachedTokens = $cachedTokens
        cachedCost = $cachedCost
    }
}

# Calculate duration from first/last entry timestamps
$firstEntry = $entries | Select-Object -First 1
$lastEntry = $entries | Select-Object -Last 1

$startTime = [DateTime]::Parse($firstEntry.timestamp)
$endTime = [DateTime]::Parse($lastEntry.timestamp)
$durationMs = ($endTime - $startTime).TotalMilliseconds

# Find transcript path if not provided
if (-not $TranscriptPath) {
    # Encode project path to match Claude's folder naming
    $resolved = (Resolve-Path $ProjectPath).Path
    $encoded = $resolved -replace '\\', '/' -replace ':', '-' -replace ' ', '-' -replace '/', '-'
    if ($encoded.StartsWith('-')) { $encoded = $encoded.Substring(1) }

    $transcriptsDir = Join-Path $env:USERPROFILE ".claude\projects\$encoded"
    $TranscriptPath = Join-Path $transcriptsDir "$SessionId.jsonl"
}

# Parse transcript for TodoWrite calls
$todoChanges = @()
if (Test-Path $TranscriptPath) {
    Write-Host "Parsing transcript for todo timing..."
    $lines = Get-Content $TranscriptPath

    foreach ($line in $lines) {
        if ($line -match '"name"\s*:\s*"TodoWrite"') {
            try {
                $obj = $line | ConvertFrom-Json
                $timestamp = $obj.timestamp
                $todoContent = $obj.message.content | Where-Object { $_.type -eq "tool_use" -and $_.name -eq "TodoWrite" }

                if ($todoContent -and $todoContent.input.todos) {
                    $todoChanges += @{
                        timestamp = $timestamp
                        todos = $todoContent.input.todos
                    }
                }
            } catch {
                # Skip unparseable lines
            }
        }
    }
}

# Analyze per-todo durations
$todoBreakdown = @()
$todoTimings = @{}  # Track when each todo started

foreach ($change in $todoChanges) {
    $changeTime = [DateTime]::Parse($change.timestamp)

    foreach ($todo in $change.todos) {
        $content = $todo.content
        $status = $todo.status

        if ($status -eq "in_progress") {
            # Todo started
            $todoTimings[$content] = @{
                startTime = $changeTime
                content = $content
            }
        }
        elseif ($status -eq "completed" -and $todoTimings.ContainsKey($content)) {
            # Todo completed - calculate duration
            $startedAt = $todoTimings[$content].startTime
            $todoDurationMs = ($changeTime - $startedAt).TotalMilliseconds

            # Get actual tokens and cost from entries within this time window
            # Cost is calculated using accurate per-model pricing including cache rates
            $windowData = Get-TokensInWindow -Entries $entries -StartTime $startedAt -EndTime $changeTime
            $todoTokens = $windowData.tokens
            $todoCost = $windowData.cost

            $todoBreakdown += @{
                content = $content
                durationMs = [int]$todoDurationMs
                durationFormatted = "{0:mm}m {0:ss}s" -f [TimeSpan]::FromMilliseconds($todoDurationMs)
                cost = [Math]::Round($windowData.cost, 4)
                tokens = $windowData.tokens
                regularTokens = $windowData.regularTokens
                regularCost = [Math]::Round($windowData.regularCost, 4)
                cachedTokens = $windowData.cachedTokens
                cachedCost = [Math]::Round($windowData.cachedCost, 4)
                startedAt = $startedAt.ToString("o")
                completedAt = $changeTime.ToString("o")
            }

            $todoTimings.Remove($content)
        }
    }
}

# Calculate session-level token breakdown from all entries
$sessionRegularTokens = 0
$sessionCachedTokens = 0
$sessionRegularCost = 0
$sessionCachedCost = 0

foreach ($entry in $entries) {
    $model = $entry.model
    $prices = if ($PRICING.ContainsKey($model)) { $PRICING[$model] } else { $PRICING["default"] }

    if ($entry.inputTokens) {
        $sessionRegularTokens += $entry.inputTokens
        $sessionRegularCost += ($entry.inputTokens / 1000000) * $prices.input
    }
    if ($entry.outputTokens) {
        $sessionRegularTokens += $entry.outputTokens
        $sessionRegularCost += ($entry.outputTokens / 1000000) * $prices.output
    }
    if ($entry.cacheCreationTokens) {
        $sessionCachedTokens += $entry.cacheCreationTokens
        $sessionCachedCost += ($entry.cacheCreationTokens / 1000000) * $prices.cacheWrite
    }
    if ($entry.cacheReadTokens) {
        $sessionCachedTokens += $entry.cacheReadTokens
        $sessionCachedCost += ($entry.cacheReadTokens / 1000000) * $prices.cacheRead
    }
}

# Build result
$result = @{
    sessionId = $SessionId
    totalCost = [Math]::Round($totalCost, 4)
    totalTokens = $totalTokens
    regularTokens = $sessionRegularTokens
    regularCost = [Math]::Round($sessionRegularCost, 4)
    cachedTokens = $sessionCachedTokens
    cachedCost = [Math]::Round($sessionCachedCost, 4)
    durationMs = [int]$durationMs
    durationFormatted = "{0:mm}m {0:ss}s" -f [TimeSpan]::FromMilliseconds($durationMs)
    startedAt = $startTime.ToString("o")
    completedAt = $endTime.ToString("o")
    todoBreakdown = $todoBreakdown
    transcriptPath = $TranscriptPath
}

# Output as JSON
$result | ConvertTo-Json -Depth 10
