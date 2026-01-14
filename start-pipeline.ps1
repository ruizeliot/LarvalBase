<#
.SYNOPSIS
    Start Pipeline Orchestrator v11

.DESCRIPTION
    Copies orchestrator CLAUDE.md to project and launches Claude.
    The orchestrator handles everything else (manifest, workers, etc.)

.PARAMETER ProjectPath
    Path to the project directory (required)

.PARAMETER NoLaunch
    Copy CLAUDE.md but don't launch Claude (useful for manual start)

.EXAMPLE
    .\start-pipeline.ps1 "C:\Users\ahunt\Documents\IMT Claude\my-project"

.EXAMPLE
    .\start-pipeline.ps1 .\my-project -NoLaunch
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$ProjectPath,

    [switch]$NoLaunch
)

# Resolve paths
$PipelineOffice = $PSScriptRoot
$OrchestratorSource = Join-Path $PipelineOffice "claude-md\orchestrator-v11.md"

# Resolve project path (handle relative paths)
if (-not [System.IO.Path]::IsPathRooted($ProjectPath)) {
    $ProjectPath = Resolve-Path $ProjectPath -ErrorAction SilentlyContinue
    if (-not $ProjectPath) {
        Write-Host "ERROR: Project path does not exist: $ProjectPath" -ForegroundColor Red
        exit 1
    }
}

$ProjectClaudeDir = Join-Path $ProjectPath ".claude"
$ProjectClaudeMd = Join-Path $ProjectClaudeDir "CLAUDE.md"

# Validate
if (-not (Test-Path $OrchestratorSource)) {
    Write-Host "ERROR: Orchestrator not found: $OrchestratorSource" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Project path does not exist: $ProjectPath" -ForegroundColor Red
    exit 1
}

# Check for brainstorm files (required for pipeline)
$BrainstormNotes = Join-Path $ProjectPath "docs\brainstorm-notes.md"
$UserStories = Join-Path $ProjectPath "docs\user-stories.md"

if (-not (Test-Path $BrainstormNotes) -or -not (Test-Path $UserStories)) {
    Write-Host ""
    Write-Host "WARNING: Brainstorm files not found!" -ForegroundColor Yellow
    Write-Host "  - docs/brainstorm-notes.md: $(if (Test-Path $BrainstormNotes) { 'Found' } else { 'MISSING' })"
    Write-Host "  - docs/user-stories.md: $(if (Test-Path $UserStories) { 'Found' } else { 'MISSING' })"
    Write-Host ""
    Write-Host "Run /brainstorm first to create these files." -ForegroundColor Yellow
    Write-Host ""

    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        exit 0
    }
}

# Create .claude directory if needed
if (-not (Test-Path $ProjectClaudeDir)) {
    New-Item -ItemType Directory -Path $ProjectClaudeDir -Force | Out-Null
}

# Copy orchestrator CLAUDE.md
Copy-Item -Path $OrchestratorSource -Destination $ProjectClaudeMd -Force

Write-Host "Pipeline v11 | $(Split-Path $ProjectPath -Leaf)" -ForegroundColor Cyan

if ($NoLaunch) {
    Write-Host "NoLaunch specified. Start Claude manually:" -ForegroundColor Yellow
    Write-Host "  cd `"$ProjectPath`"" -ForegroundColor Gray
    Write-Host "  claude --dangerously-skip-permissions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Then type: BEGIN" -ForegroundColor Yellow
    exit 0
}

# Spawn orchestrator in a NEW Windows Terminal window
$spawnScript = Join-Path $PipelineOffice "lib\spawn-orchestrator-wt.ps1"
$spawnOutput = & $spawnScript -ProjectPath $ProjectPath 2>&1 | Out-String

# Read the orchestrator PID
$pidFile = Join-Path $ProjectPath ".pipeline\orchestrator-powershell-pid.txt"
$maxWait = 10
$waited = 0
while (-not (Test-Path $pidFile) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
}

if (-not (Test-Path $pidFile)) {
    Write-Host "ERROR: Could not get orchestrator PID" -ForegroundColor Red
    exit 1
}

$orchPid = [int](Get-Content $pidFile).Trim()

# Wait for Claude to initialize
Write-Host "Waiting for Claude..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Inject BEGIN message
$injectScript = Join-Path $PipelineOffice "lib\inject-message.ps1"
$injectOutput = & powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '$injectScript' -TargetPid $orchPid -Message 'BEGIN'" 2>&1 | Out-String

Write-Host "Started (PID: $orchPid)" -ForegroundColor Green
