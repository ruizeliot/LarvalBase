<#
.SYNOPSIS
    Start Pipeline v11.1 (Orchestrator-First)

.DESCRIPTION
    Spawns orchestrator in a named Windows Terminal window.
    The orchestrator then spawns dashboard/worker/supervisor panes when ready.

    Final layout:
    - Dashboard (left 50%)
    - Orchestrator (top-right ~33%)
    - Worker (middle-right ~33%)
    - Supervisor (bottom-right ~33%)

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

# Create .pipeline directory if needed
$ProjectPipelineDir = Join-Path $ProjectPath ".pipeline"
if (-not (Test-Path $ProjectPipelineDir)) {
    New-Item -ItemType Directory -Path $ProjectPipelineDir -Force | Out-Null
}

# Copy orchestrator CLAUDE.md
Copy-Item -Path $OrchestratorSource -Destination $ProjectClaudeMd -Force

# Copy pipeline settings (includes SessionStart hook for auto-begin)
$SettingsSource = Join-Path $PipelineOffice "templates\pipeline-settings.json"
$SettingsDest = Join-Path $ProjectClaudeDir "settings.json"
Copy-Item -Path $SettingsSource -Destination $SettingsDest -Force

# Create auto-begin signal file (SessionStart hook will detect this)
$AutoBeginFile = Join-Path $ProjectPipelineDir "auto-begin.txt"
"BEGIN" | Out-File -FilePath $AutoBeginFile -Encoding ASCII -NoNewline

Write-Host "Pipeline v11 | $(Split-Path $ProjectPath -Leaf)" -ForegroundColor Cyan

if ($NoLaunch) {
    Write-Host "NoLaunch specified. Start Claude manually:" -ForegroundColor Yellow
    Write-Host "  cd `"$ProjectPath`"" -ForegroundColor Gray
    Write-Host "  claude --dangerously-skip-permissions" -ForegroundColor Gray
    exit 0
}

# v11.1: Spawn orchestrator only - it will spawn dashboard/worker/supervisor when ready
Write-Host "Spawning Orchestrator (it will spawn other panes)..." -ForegroundColor Cyan

$spawnScript = Join-Path $PipelineOffice "lib\spawn-orchestrator-wt.ps1"
$spawnOutput = & $spawnScript -ProjectPath $ProjectPath 2>&1 | Out-String

# Wait for Claude to be ready (SessionStart hook creates this file)
$readyFile = Join-Path $ProjectPipelineDir "claude-ready.txt"
$pidFile = Join-Path $ProjectPipelineDir "orchestrator-powershell-pid.txt"
$maxWait = 30
$waited = 0

Write-Host "Waiting for Claude..." -ForegroundColor Gray
while (-not (Test-Path $readyFile) -and $waited -lt $maxWait) {
    Start-Sleep -Milliseconds 500
    $waited++
}

if (-not (Test-Path $readyFile)) {
    Write-Host "Timeout waiting for Claude" -ForegroundColor Yellow
    exit 0
}

# Small delay after ready signal for UI to stabilize
Start-Sleep -Seconds 2

# Inject BEGIN
$orchPid = [int](Get-Content $pidFile).Trim()
$injectScript = Join-Path $PipelineOffice "lib\inject-message.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '$injectScript' -TargetPid $orchPid -Message 'BEGIN'" 2>&1 | Out-Null

# Cleanup
Remove-Item -Path $readyFile -Force -ErrorAction SilentlyContinue

Write-Host "Started" -ForegroundColor Green
