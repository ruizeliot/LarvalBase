# analyze-session.ps1 - Analyze a Claude session for cost/duration/tokens
# Parses transcript JSONL directly for accurate pricing (no ccusage dependency)
# Includes per-todo breakdown with regular vs cached token/cost split

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$SessionId,

    [Parameter(Mandatory=$false)]
    [string]$TranscriptPath  # Optional - will derive from SessionId if not provided
)

$ErrorActionPreference = "Stop"

# Pricing per million tokens (from https://platform.claude.com/docs/en/about-claude/pricing)
# Cache pricing: 5-min = 1.25x base input, 1-hour = 2x base input, cache read = 0.1x base input
$PRICING = @{
    "claude-opus-4-5-20251101" = @{
        input = 5.0
        output = 25.0
        cacheWrite5m = 6.25    # 5-min cache write (1.25x input)
        cacheWrite1h = 10.0    # 1-hour cache write (2x input)
        cacheRead = 0.50       # Cache read (0.1x input)
    }
    "claude-sonnet-4-5-20250929" = @{
        input = 3.0
        output = 15.0
        cacheWrite5m = 3.75
        cacheWrite1h = 6.0
        cacheRead = 0.30
    }
    "claude-sonnet-4-20250514" = @{
        input = 3.0
        output = 15.0
        cacheWrite5m = 3.75
        cacheWrite1h = 6.0
        cacheRead = 0.30
    }
    "claude-haiku-4-5-20251001" = @{
        input = 1.0
        output = 5.0
        cacheWrite5m = 1.25
        cacheWrite1h = 2.0
        cacheRead = 0.10
    }
    # Fallback for unknown models (use Sonnet pricing as reasonable default)
    "default" = @{
        input = 3.0
        output = 15.0
        cacheWrite5m = 3.75
        cacheWrite1h = 6.0
        cacheRead = 0.30
    }
}

# Find transcript path if not provided
if (-not $TranscriptPath) {
    $resolved = (Resolve-Path $ProjectPath).Path
    $encoded = $resolved -replace '\\', '/' -replace ':', '-' -replace ' ', '-' -replace '/', '-'
    if ($encoded.StartsWith('-')) { $encoded = $encoded.Substring(1) }

    $transcriptsDir = Join-Path $env:USERPROFILE ".claude\projects\$encoded"
    $TranscriptPath = Join-Path $transcriptsDir "$SessionId.jsonl"
}

if (-not (Test-Path $TranscriptPath)) {
    Write-Error "Transcript not found: $TranscriptPath"
    exit 1
}

Write-Host "Parsing transcript: $TranscriptPath" -ForegroundColor Cyan

# Parse transcript JSONL
$lines = Get-Content $TranscriptPath
$usageEntries = @()
$todoChanges = @()

foreach ($line in $lines) {
    try {
        $obj = $line | ConvertFrom-Json

        # Extract usage data from API responses
        if ($obj.message -and $obj.message.usage) {
            $usage = $obj.message.usage
            $model = $obj.message.model

            $entry = @{
                timestamp = $obj.timestamp
                model = $model
                inputTokens = if ($usage.input_tokens) { $usage.input_tokens } else { 0 }
                outputTokens = if ($usage.output_tokens) { $usage.output_tokens } else { 0 }
                cacheReadTokens = if ($usage.cache_read_input_tokens) { $usage.cache_read_input_tokens } else { 0 }
                # Cache creation breakdown (5m vs 1h)
                cacheWrite5mTokens = 0
                cacheWrite1hTokens = 0
            }

            # Parse cache_creation breakdown if available
            if ($usage.cache_creation) {
                if ($usage.cache_creation.ephemeral_5m_input_tokens) {
                    $entry.cacheWrite5mTokens = $usage.cache_creation.ephemeral_5m_input_tokens
                }
                if ($usage.cache_creation.ephemeral_1h_input_tokens) {
                    $entry.cacheWrite1hTokens = $usage.cache_creation.ephemeral_1h_input_tokens
                }
            } elseif ($usage.cache_creation_input_tokens) {
                # Fallback: if no breakdown, assume all cache writes are 5m
                $entry.cacheWrite5mTokens = $usage.cache_creation_input_tokens
            }

            $usageEntries += $entry
        }

        # Extract TodoWrite calls
        if ($obj.message -and $obj.message.content) {
            $todoContent = $obj.message.content | Where-Object { $_.type -eq "tool_use" -and $_.name -eq "TodoWrite" }
            if ($todoContent -and $todoContent.input.todos) {
                $todoChanges += @{
                    timestamp = $obj.timestamp
                    todos = $todoContent.input.todos
                }
            }
        }
    } catch {
        # Skip unparseable lines
    }
}

Write-Host "Found $($usageEntries.Count) API responses with usage data" -ForegroundColor Green
Write-Host "Found $($todoChanges.Count) TodoWrite calls" -ForegroundColor Green

# Helper function to calculate cost for tokens using model-specific pricing
function Get-TokenCost {
    param(
        [string]$Model,
        [int]$InputTokens,
        [int]$OutputTokens,
        [int]$CacheReadTokens,
        [int]$CacheWrite5mTokens,
        [int]$CacheWrite1hTokens
    )

    $prices = if ($PRICING.ContainsKey($Model)) { $PRICING[$Model] } else { $PRICING["default"] }

    $regularCost = 0
    $cachedCost = 0

    # Regular tokens cost
    $regularCost += ($InputTokens / 1000000) * $prices.input
    $regularCost += ($OutputTokens / 1000000) * $prices.output

    # Cached tokens cost (with proper 5m vs 1h pricing)
    $cachedCost += ($CacheWrite5mTokens / 1000000) * $prices.cacheWrite5m
    $cachedCost += ($CacheWrite1hTokens / 1000000) * $prices.cacheWrite1h
    $cachedCost += ($CacheReadTokens / 1000000) * $prices.cacheRead

    return @{
        regularCost = $regularCost
        cachedCost = $cachedCost
        totalCost = $regularCost + $cachedCost
    }
}

# Helper function to sum tokens and cost from entries within a time window
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
            # Regular tokens: input + output
            $regularTokens += $entry.inputTokens + $entry.outputTokens

            # Cached tokens: cache read + cache writes
            $cachedTokens += $entry.cacheReadTokens + $entry.cacheWrite5mTokens + $entry.cacheWrite1hTokens

            # Calculate costs
            $costs = Get-TokenCost -Model $entry.model `
                -InputTokens $entry.inputTokens `
                -OutputTokens $entry.outputTokens `
                -CacheReadTokens $entry.cacheReadTokens `
                -CacheWrite5mTokens $entry.cacheWrite5mTokens `
                -CacheWrite1hTokens $entry.cacheWrite1hTokens

            $regularCost += $costs.regularCost
            $cachedCost += $costs.cachedCost
        }
    }

    return @{
        tokens = $regularTokens + $cachedTokens
        cost = $regularCost + $cachedCost
        regularTokens = $regularTokens
        regularCost = $regularCost
        cachedTokens = $cachedTokens
        cachedCost = $cachedCost
    }
}

# Calculate session duration from first/last entry timestamps
if ($usageEntries.Count -eq 0) {
    Write-Error "No usage entries found in transcript"
    exit 1
}

$firstEntry = $usageEntries | Select-Object -First 1
$lastEntry = $usageEntries | Select-Object -Last 1

$startTime = [DateTime]::Parse($firstEntry.timestamp)
$endTime = [DateTime]::Parse($lastEntry.timestamp)
$durationMs = ($endTime - $startTime).TotalMilliseconds

# Calculate session-level totals
$sessionRegularTokens = 0
$sessionCachedTokens = 0
$sessionRegularCost = 0
$sessionCachedCost = 0

foreach ($entry in $usageEntries) {
    # Regular tokens
    $sessionRegularTokens += $entry.inputTokens + $entry.outputTokens

    # Cached tokens
    $sessionCachedTokens += $entry.cacheReadTokens + $entry.cacheWrite5mTokens + $entry.cacheWrite1hTokens

    # Calculate costs with proper pricing
    $costs = Get-TokenCost -Model $entry.model `
        -InputTokens $entry.inputTokens `
        -OutputTokens $entry.outputTokens `
        -CacheReadTokens $entry.cacheReadTokens `
        -CacheWrite5mTokens $entry.cacheWrite5mTokens `
        -CacheWrite1hTokens $entry.cacheWrite1hTokens

    $sessionRegularCost += $costs.regularCost
    $sessionCachedCost += $costs.cachedCost
}

$sessionTotalTokens = $sessionRegularTokens + $sessionCachedTokens
$sessionTotalCost = $sessionRegularCost + $sessionCachedCost

# Analyze per-todo durations using window-based approach
# Each window is the time between consecutive TodoWrite calls
# All todos marked "completed" in a window split that window's cost evenly
$todoBreakdown = @()
$processedTodos = @{}  # Track which todos have already been added

for ($i = 0; $i -lt $todoChanges.Count; $i++) {
    $change = $todoChanges[$i]
    $changeTime = [DateTime]::Parse($change.timestamp)

    # Find all todos marked "completed" in this TodoWrite call that haven't been processed yet
    $completedTodos = $change.todos | Where-Object {
        $_.status -eq "completed" -and -not $processedTodos.ContainsKey($_.content)
    }

    if ($completedTodos.Count -gt 0) {
        # Window start is the previous TodoWrite timestamp (or session start if first)
        if ($i -eq 0) {
            $windowStart = $startTime
        } else {
            $windowStart = [DateTime]::Parse($todoChanges[$i - 1].timestamp)
        }
        $windowEnd = $changeTime

        # Calculate duration for this window
        $windowDurationMs = ($windowEnd - $windowStart).TotalMilliseconds

        # Get tokens and cost for this window
        $windowData = Get-TokensInWindow -Entries $usageEntries -StartTime $windowStart -EndTime $windowEnd

        # Split cost evenly among all completed todos in this window
        $splitCount = $completedTodos.Count
        $perTodoDurationMs = [int]($windowDurationMs / $splitCount)
        $perTodoTokens = [int]($windowData.tokens / $splitCount)
        $perTodoRegularTokens = [int]($windowData.regularTokens / $splitCount)
        $perTodoCachedTokens = [int]($windowData.cachedTokens / $splitCount)
        $perTodoCost = [Math]::Round($windowData.cost / $splitCount, 4)
        $perTodoRegularCost = [Math]::Round($windowData.regularCost / $splitCount, 4)
        $perTodoCachedCost = [Math]::Round($windowData.cachedCost / $splitCount, 4)

        foreach ($todo in $completedTodos) {
            $todoBreakdown += @{
                content = $todo.content
                durationMs = $perTodoDurationMs
                durationFormatted = "{0:mm}m {0:ss}s" -f [TimeSpan]::FromMilliseconds($perTodoDurationMs)
                tokens = $perTodoTokens
                cost = $perTodoCost
                regularTokens = $perTodoRegularTokens
                regularCost = $perTodoRegularCost
                cachedTokens = $perTodoCachedTokens
                cachedCost = $perTodoCachedCost
                startedAt = $windowStart.ToString("o")
                completedAt = $windowEnd.ToString("o")
            }
            # Mark this todo as processed so we don't add it again
            $processedTodos[$todo.content] = $true
        }
    }
}

# Fetch subscription usage percentage from Anthropic OAuth API
$subscriptionUsage = $null
try {
    $credsPath = Join-Path $env:USERPROFILE ".claude\.credentials.json"
    if (Test-Path $credsPath) {
        $creds = Get-Content $credsPath | ConvertFrom-Json
        if ($creds.claudeAiOauth -and $creds.claudeAiOauth.accessToken) {
            $token = $creds.claudeAiOauth.accessToken
            $headers = @{
                'Authorization' = "Bearer $token"
                'anthropic-beta' = 'oauth-2025-04-20'
                'User-Agent' = 'claude-code/2.0.32'
            }
            $usageResponse = Invoke-RestMethod -Uri 'https://api.anthropic.com/api/oauth/usage' -Headers $headers -Method Get -ErrorAction SilentlyContinue

            if ($usageResponse) {
                $fiveHourUtil = if ($usageResponse.five_hour) { $usageResponse.five_hour.utilization } else { $null }
                $sevenDayUtil = if ($usageResponse.seven_day) { $usageResponse.seven_day.utilization } else { $null }
                $sevenDayResets = if ($usageResponse.seven_day) { $usageResponse.seven_day.resets_at } else { $null }

                # Calculate subscription value based on API cost and usage percentage
                $weeklyApiValue = $null
                $monthlyApiValue = $null
                $subscriptionType = $creds.claudeAiOauth.subscriptionType
                $rateLimitTier = $creds.claudeAiOauth.rateLimitTier

                # Determine subscription price
                $subscriptionPrice = switch -Wildcard ($rateLimitTier) {
                    "*max_20x*" { 200 }
                    "*max_5x*" { 100 }
                    "*pro*" { 20 }
                    default { 200 }  # Assume Max if unknown
                }

                $subscriptionUsage = @{
                    fiveHourUtilization = $fiveHourUtil
                    sevenDayUtilization = $sevenDayUtil
                    sevenDayResetsAt = $sevenDayResets
                    subscriptionType = $subscriptionType
                    subscriptionPrice = $subscriptionPrice
                    # Note: For accurate weekly API value, use analyze-weekly.ps1 which sums all sessions
                }

                Write-Host "Subscription usage: $sevenDayUtil% of 7-day limit" -ForegroundColor Magenta
            }
        }
    }
} catch {
    Write-Host "Could not fetch subscription usage: $_" -ForegroundColor Yellow
}

# Build result
$result = @{
    sessionId = $SessionId
    totalCost = [Math]::Round($sessionTotalCost, 4)
    totalTokens = $sessionTotalTokens
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
    subscriptionUsage = $subscriptionUsage
}

# Output as JSON
$result | ConvertTo-Json -Depth 10
