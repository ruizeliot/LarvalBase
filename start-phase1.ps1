<#
.SYNOPSIS
    Start Phase 1 Brainstorming Session v11

.DESCRIPTION
    Copies Phase 1 CLAUDE.md to project and launches Claude for interactive brainstorming.
    Creates docs/brainstorm-notes.md and docs/user-stories.md.

.PARAMETER ProjectPath
    Path to the project directory (required)

.PARAMETER NoLaunch
    Copy CLAUDE.md but don't launch Claude (useful for manual start)

.EXAMPLE
    .\start-phase1.ps1 "C:\Users\ahunt\Documents\IMT Claude\my-project"

.EXAMPLE
    .\start-phase1.ps1 .\my-project -NoLaunch
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$ProjectPath,

    [switch]$NoLaunch
)

# Resolve paths
$PipelineOffice = $PSScriptRoot
$Phase1Source = Join-Path $PipelineOffice "claude-md\phase-1.md"

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
if (-not (Test-Path $Phase1Source)) {
    Write-Host "ERROR: Phase 1 CLAUDE.md not found: $Phase1Source" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ProjectPath)) {
    Write-Host "ERROR: Project path does not exist: $ProjectPath" -ForegroundColor Red
    exit 1
}

# Check for existing brainstorm files
$BrainstormNotes = Join-Path $ProjectPath "docs\brainstorm-notes.md"
$UserStories = Join-Path $ProjectPath "docs\user-stories.md"

if ((Test-Path $BrainstormNotes) -or (Test-Path $UserStories)) {
    Write-Host ""
    Write-Host "WARNING: Brainstorm files already exist!" -ForegroundColor Yellow
    Write-Host "  - docs/brainstorm-notes.md: $(if (Test-Path $BrainstormNotes) { 'EXISTS' } else { 'Not found' })"
    Write-Host "  - docs/user-stories.md: $(if (Test-Path $UserStories) { 'EXISTS' } else { 'Not found' })"
    Write-Host ""

    $choice = Read-Host "Overwrite? (y/N)"
    if ($choice -eq 'y' -or $choice -eq 'Y') {
        Remove-Item -Path $BrainstormNotes -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $UserStories -Force -ErrorAction SilentlyContinue
        Write-Host "Existing files removed." -ForegroundColor Gray
    } else {
        Write-Host "Keeping existing files. Claude will continue from where you left off." -ForegroundColor Gray
    }
}

# Create directories
if (-not (Test-Path $ProjectClaudeDir)) {
    New-Item -ItemType Directory -Path $ProjectClaudeDir -Force | Out-Null
}

$ProjectPipelineDir = Join-Path $ProjectPath ".pipeline"
if (-not (Test-Path $ProjectPipelineDir)) {
    New-Item -ItemType Directory -Path $ProjectPipelineDir -Force | Out-Null
}

$DocsDir = Join-Path $ProjectPath "docs"
if (-not (Test-Path $DocsDir)) {
    New-Item -ItemType Directory -Path $DocsDir -Force | Out-Null
}

# Copy Phase 1 CLAUDE.md
Copy-Item -Path $Phase1Source -Destination $ProjectClaudeMd -Force

# Copy pipeline settings (includes SessionStart hook for auto-begin)
$SettingsSource = Join-Path $PipelineOffice "templates\pipeline-settings.json"
$SettingsDest = Join-Path $ProjectClaudeDir "settings.json"
Copy-Item -Path $SettingsSource -Destination $SettingsDest -Force

# Create auto-begin signal file (SessionStart hook will detect this)
$AutoBeginFile = Join-Path $ProjectPipelineDir "auto-begin.txt"
"BEGIN" | Out-File -FilePath $AutoBeginFile -Encoding ASCII -NoNewline

# Create Phase 1 manifest
$ProjectName = Split-Path $ProjectPath -Leaf
$Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
$ManifestPath = Join-Path $ProjectPipelineDir "manifest.json"

$Manifest = @{
    version = "11.0.0"
    project = @{
        name = $ProjectName
        path = $ProjectPath
    }
    stack = $null  # Will be set during brainstorming - Claude MUST ask
    mode = "new"
    status = "brainstorming"
    currentPhase = "1"
    phases = @{
        "1" = @{ status = "in_progress"; startedAt = $Timestamp }
        "2" = @{ status = "pending" }
        "3" = @{ status = "pending" }
        "4" = @{ status = "pending" }
        "5" = @{ status = "pending" }
    }
    createdAt = $Timestamp
} | ConvertTo-Json -Depth 10

$Manifest | Out-File -FilePath $ManifestPath -Encoding UTF8

Write-Host "Phase 1 | $(Split-Path $ProjectPath -Leaf)" -ForegroundColor Cyan

if ($NoLaunch) {
    Write-Host "NoLaunch specified. Start Claude manually:" -ForegroundColor Yellow
    Write-Host "  cd `"$ProjectPath`"" -ForegroundColor Gray
    Write-Host "  claude --dangerously-skip-permissions" -ForegroundColor Gray
    exit 0
}

# Spawn Claude in a NEW Windows Terminal window
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
