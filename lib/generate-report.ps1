param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

# Resolve to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
$reportPath = Join-Path $ProjectPath "PIPELINE-REPORT.md"
$userStoriesPath = Join-Path $ProjectPath "docs\user-stories.md"

if (-not (Test-Path $manifestPath)) {
    Write-Error "Manifest not found: $manifestPath"
    exit 1
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

# Helper function to format duration
function Format-Duration {
    param([int]$ms)
    if ($ms -eq 0) { return "--" }
    $totalSeconds = [math]::Floor($ms / 1000)
    $hours = [math]::Floor($totalSeconds / 3600)
    $minutes = [math]::Floor(($totalSeconds % 3600) / 60)
    $seconds = $totalSeconds % 60
    if ($hours -gt 0) {
        return "$hours`h $($minutes.ToString('00'))`m $($seconds.ToString('00'))`s"
    } elseif ($minutes -gt 0) {
        return "$minutes`m $($seconds.ToString('00'))`s"
    } else {
        return "$seconds`s"
    }
}

# Helper function to format cost
function Format-Cost {
    param($cost)
    if ($null -eq $cost -or $cost -eq 0) { return "--" }
    return "`${0:F2}" -f $cost
}

# Helper function to format tokens
function Format-Tokens {
    param($tokens)
    if ($null -eq $tokens -or $tokens -eq 0) { return "--" }
    if ($tokens -ge 1000000) {
        return "{0:F1}M" -f ($tokens / 1000000)
    } elseif ($tokens -ge 1000) {
        return "{0:F1}K" -f ($tokens / 1000)
    }
    return $tokens.ToString()
}

# Phase names
$phaseNames = @{
    "1" = "Brainstorm"
    "2" = "Technical"
    "3" = "Bootstrap"
    "4" = "Implement"
    "5" = "Finalize"
}

# Build report
$report = @()

# Header
$report += "# Pipeline Report"
$report += ""
$report += "**Project:** $($manifest.project.name)"
$report += "**Stack:** $($manifest.stack)"
$report += "**Mode:** $($manifest.mode)"
$report += "**Completed:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report += ""
$report += "---"
$report += ""

# Summary table
$report += "## Summary"
$report += ""
$totalDuration = 0
$totalCost = 0
$totalTokens = 0

foreach ($phase in $manifest.phases.PSObject.Properties) {
    if ($phase.Value.duration) { $totalDuration += $phase.Value.duration }
    if ($phase.Value.cost) { $totalCost += $phase.Value.cost }
    if ($phase.Value.tokens) { $totalTokens += $phase.Value.tokens }
}

# Add epic costs for phase 4
if ($manifest.epics) {
    foreach ($epic in $manifest.epics) {
        if ($epic.duration) { $totalDuration += $epic.duration }
        if ($epic.cost) { $totalCost += $epic.cost }
        if ($epic.tokens) { $totalTokens += $epic.tokens }
    }
}

$report += "| Metric | Value |"
$report += "|--------|-------|"
$report += "| **Total Duration** | $(Format-Duration $totalDuration) |"
$report += "| **Total Cost** | $(Format-Cost $totalCost) |"
$report += "| **Total Tokens** | $(Format-Tokens $totalTokens) |"
$report += ""
$report += "---"
$report += ""

# Phases
$report += "## Phases"
$report += ""

# Determine final phase based on mode
$finalPhase = if ($manifest.mode -eq "feature") { 3 } else { 5 }

for ($p = 1; $p -le $finalPhase; $p++) {
    $phaseKey = $p.ToString()
    $phase = $manifest.phases.$phaseKey
    $phaseName = $phaseNames[$phaseKey]

    if ($phase.status -eq "complete") {
        $duration = Format-Duration $phase.duration
        $cost = Format-Cost $phase.cost
        $tokens = Format-Tokens $phase.tokens
        $report += "### Phase $p : $phaseName"
        $report += ""
        $report += "| Duration | Cost | Tokens |"
        $report += "|----------|------|--------|"
        $report += "| $duration | $cost | $tokens |"
        $report += ""

        # Todo breakdown
        if ($phase.todoBreakdown -and $phase.todoBreakdown.Count -gt 0) {
            $report += "**Task Breakdown:**"
            $report += ""
            $report += "| Task | Duration | Cost | Tokens |"
            $report += "|------|----------|------|--------|"
            foreach ($todo in $phase.todoBreakdown) {
                $taskDuration = Format-Duration $todo.durationMs
                $taskCost = Format-Cost $todo.cost
                $taskTokens = Format-Tokens $todo.tokens
                $taskName = $todo.content
                if ($taskName.Length -gt 50) { $taskName = $taskName.Substring(0, 47) + "..." }
                $report += "| $taskName | $taskDuration | $taskCost | $taskTokens |"
            }
            $report += ""
        }
    } else {
        $report += "### Phase $p : $phaseName"
        $report += ""
        $report += "*Status: $($phase.status)*"
        $report += ""
    }
}

# Epics (Phase 4 detail)
if ($manifest.epics -and $manifest.epics.Count -gt 0) {
    $report += "---"
    $report += ""
    $report += "## Epics (Phase 4 Detail)"
    $report += ""

    foreach ($epic in $manifest.epics) {
        $epicIcon = "[x]"
        if ($epic.status -eq "complete") { $epicIcon = "[x]" }
        elseif ($epic.status -eq "running") { $epicIcon = "[>]" }
        else { $epicIcon = "[ ]" }
        
        $report += "### $epicIcon Epic $($epic.id) : $($epic.name)"
        $report += ""

        if ($epic.status -eq "complete" -or $epic.status -eq "running") {
            $duration = Format-Duration $epic.duration
            $cost = Format-Cost $epic.cost
            $tokens = Format-Tokens $epic.tokens

            $report += "| Duration | Cost | Tokens |"
            $report += "|----------|------|--------|"
            $report += "| $duration | $cost | $tokens |"
            $report += ""

            # Todo breakdown
            if ($epic.todoBreakdown -and $epic.todoBreakdown.Count -gt 0) {
                $report += "**Task Breakdown:**"
                $report += ""
                $report += "| Task | Duration | Cost | Tokens |"
                $report += "|------|----------|------|--------|"
                foreach ($todo in $epic.todoBreakdown) {
                    $taskDuration = Format-Duration $todo.durationMs
                    $taskCost = Format-Cost $todo.cost
                    $taskTokens = Format-Tokens $todo.tokens
                    $taskName = $todo.content
                    if ($taskName.Length -gt 45) { $taskName = $taskName.Substring(0, 42) + "..." }
                    $report += "| $taskName | $taskDuration | $taskCost | $taskTokens |"
                }
                $report += ""
            }
        } else {
            $report += "*Status: $($epic.status)*"
            $report += ""
        }
    }
}

# User Stories
$report += "---"
$report += ""
$report += "## User Stories"
$report += ""

if (Test-Path $userStoriesPath) {
    $userStories = Get-Content $userStoriesPath -Raw
    $report += $userStories
} else {
    $report += "*No user stories file found at docs/user-stories.md*"
}
$report += ""

# Executable (desktop only)
if ($manifest.stack -eq "desktop") {
    $report += "---"
    $report += ""
    $report += "## Executable"
    $report += ""

    $exePath = Join-Path $ProjectPath "src-tauri\target\release"
    if (Test-Path $exePath) {
        $exe = Get-ChildItem -Path $exePath -Filter "*.exe" -File | Select-Object -First 1
        if ($exe) {
            $report += "``````"
            $report += $exe.FullName
            $report += "``````"
        } else {
            $report += "*No .exe found in src-tauri/target/release*"
        }
    } else {
        $report += "*Release build not found*"
    }
    $report += ""
}

# Pricing reference
$report += "---"
$report += ""
$report += "## Pricing Reference"
$report += ""
$report += "Source: [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing)"
$report += ""
$report += "| Model | Input | Output | Cache Write | Cache Read |"
$report += "|-------|-------|--------|-------------|------------|"
$report += '| Claude Opus 4.5 | $5/MTok | $25/MTok | $6.25/MTok | $0.50/MTok |'
$report += '| Claude Sonnet 4.5 | $3/MTok | $15/MTok | $3.75/MTok | $0.30/MTok |'
$report += '| Claude Haiku 4.5 | $1/MTok | $5/MTok | $1.25/MTok | $0.10/MTok |'
$report += ""
$report += "*Cache Write = 5-minute TTL (1.25x input). Cache Read = 0.1x input.*"
$report += ""

# Footer
$report += "---"
$report += ""
$report += "*Generated by Pipeline v7.0*"

# Write report
$report -join "`n" | Out-File -FilePath $reportPath -Encoding utf8

Write-Host "Report generated: $reportPath"
