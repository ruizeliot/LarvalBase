# analyze-session.ps1 - Analyze a Claude session for cost/duration/tokens
# Uses ccusage for accurate cost, parses transcript for per-todo timing

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

            # Calculate proportional cost
            $todoCost = 0
            if ($durationMs -gt 0) {
                $todoCost = ($todoDurationMs / $durationMs) * $totalCost
            }

            $todoBreakdown += @{
                content = $content
                durationMs = [int]$todoDurationMs
                durationFormatted = "{0:mm}m {0:ss}s" -f [TimeSpan]::FromMilliseconds($todoDurationMs)
                cost = [Math]::Round($todoCost, 4)
                startedAt = $startedAt.ToString("o")
                completedAt = $changeTime.ToString("o")
            }

            $todoTimings.Remove($content)
        }
    }
}

# Build result
$result = @{
    sessionId = $SessionId
    totalCost = [Math]::Round($totalCost, 4)
    totalTokens = $totalTokens
    durationMs = [int]$durationMs
    durationFormatted = "{0:mm}m {0:ss}s" -f [TimeSpan]::FromMilliseconds($durationMs)
    startedAt = $startTime.ToString("o")
    completedAt = $endTime.ToString("o")
    todoBreakdown = $todoBreakdown
    transcriptPath = $TranscriptPath
}

# Output as JSON
$result | ConvertTo-Json -Depth 10
