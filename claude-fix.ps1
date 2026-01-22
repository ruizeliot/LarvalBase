<#
.SYNOPSIS
    Launch the Fix Agent for TDD bug fixing

.DESCRIPTION
    Initializes or resumes a fix workspace in the current project.
    Creates .fix/ directory on first run, spawns Claude with fix-agent CLAUDE.md.

.PARAMETER ProjectPath
    Path to the project directory (default: current directory)

.EXAMPLE
    claude-fix
    # Runs in current directory

.EXAMPLE
    claude-fix "C:\Users\ahunt\Documents\my-project"
    # Runs in specified project
#>

param(
    [Parameter(Position=0)]
    [string]$ProjectPath = (Get-Location).Path
)

# Resolve paths
$PipelineOffice = $PSScriptRoot
$FixAgentSource = Join-Path $PipelineOffice "claude-md\fix-agent.md"

# Resolve project path
if (-not [System.IO.Path]::IsPathRooted($ProjectPath)) {
    $ProjectPath = Resolve-Path $ProjectPath -ErrorAction SilentlyContinue
    if (-not $ProjectPath) {
        Write-Host "ERROR: Project path does not exist: $ProjectPath" -ForegroundColor Red
        exit 1
    }
}

# Validate fix-agent.md exists
if (-not (Test-Path $FixAgentSource)) {
    Write-Host "ERROR: Fix agent not found: $FixAgentSource" -ForegroundColor Red
    exit 1
}

# Validate project exists
if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Project path does not exist: $ProjectPath" -ForegroundColor Red
    exit 1
}

$FixDir = Join-Path $ProjectPath ".fix"
$FixClaudeDir = Join-Path $FixDir ".claude"
$FixClaudeMd = Join-Path $FixClaudeDir "CLAUDE.md"
$TestSuiteFile = Join-Path $FixDir "test-suite.md"
$FixHistoryFile = Join-Path $FixDir "fix-history.md"
$BugFixesDir = Join-Path $ProjectPath "docs\bug-fixes"

# Check if first run or resume
$isFirstRun = -not (Test-Path $FixDir)

if ($isFirstRun) {
    Write-Host "Initializing fix workspace..." -ForegroundColor Cyan

    # Create directories
    New-Item -ItemType Directory -Path $FixClaudeDir -Force | Out-Null
    New-Item -ItemType Directory -Path $BugFixesDir -Force | Out-Null

    # Copy fix-agent CLAUDE.md
    Copy-Item -Path $FixAgentSource -Destination $FixClaudeMd -Force

    # Create test-suite.md
    @"
# Regression Test Suite

Tests added during bug fixes. Run all before releases.

| Date | Bug ID | Test File | Command | Description |
|------|--------|-----------|---------|-------------|
"@ | Out-File -FilePath $TestSuiteFile -Encoding UTF8

    # Create fix-history.md
    @"
# Fix History

Log of bug fixes in this project.

| Date | Bug ID | Summary | Commit |
|------|--------|---------|--------|
"@ | Out-File -FilePath $FixHistoryFile -Encoding UTF8

    # Create .gitignore for .fix (optional - keep workspace out of git)
    @"
# Fix agent workspace - not committed
# Remove this file if you want to track fix workspace
"@ | Out-File -FilePath (Join-Path $FixDir ".gitignore") -Encoding UTF8

    Write-Host "Created .fix/ workspace" -ForegroundColor Green
} else {
    Write-Host "Resuming fix workspace..." -ForegroundColor Cyan

    # Ensure CLAUDE.md is up to date
    Copy-Item -Path $FixAgentSource -Destination $FixClaudeMd -Force

    # Show existing test suite count
    $testCount = (Get-Content $TestSuiteFile | Select-String "^\|.*\|.*\|.*\|.*\|.*\|$" | Measure-Object).Count - 1
    if ($testCount -gt 0) {
        Write-Host "Regression suite: $testCount tests" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Fix Agent | $(Split-Path $ProjectPath -Leaf)" -ForegroundColor Cyan
Write-Host "Workspace: .fix/" -ForegroundColor Gray
Write-Host ""

# Launch Claude in the .fix directory
Set-Location $FixDir
& claude --dangerously-skip-permissions
