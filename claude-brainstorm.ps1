<#
.SYNOPSIS
    Start Pipeline Brainstorming Session

.DESCRIPTION
    Launches Claude with Phase 1 brainstorming in a new Windows Terminal tab.
    Automatically sends BEGIN to start the conversation.
    Run from any project directory - no arguments needed.

.EXAMPLE
    cd my-project
    claude-brainstorm
#>

param(
    [Parameter(Position=0)]
    [string]$ProjectPath = (Get-Location).Path
)

# Resolve paths
$PipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$Phase1Source = Join-Path $PipelineOffice "claude-md\phase-1.md"

# Use current directory if not specified
if (-not $ProjectPath -or $ProjectPath -eq ".") {
    $ProjectPath = (Get-Location).Path
}

# Resolve relative paths
if (-not [System.IO.Path]::IsPathRooted($ProjectPath)) {
    $ProjectPath = Join-Path (Get-Location).Path $ProjectPath
}

$ProjectClaudeDir = Join-Path $ProjectPath ".claude"
$ProjectClaudeMd = Join-Path $ProjectClaudeDir "CLAUDE.md"
$ProjectPipelineDir = Join-Path $ProjectPath ".pipeline"
$DocsDir = Join-Path $ProjectPath "docs"
$ManifestPath = Join-Path $ProjectPipelineDir "manifest.json"

# Validate source
if (-not (Test-Path $Phase1Source)) {
    Write-Host "ERROR: Phase 1 CLAUDE.md not found: $Phase1Source" -ForegroundColor Red
    exit 1
}

# Create directories
@($ProjectClaudeDir, $ProjectPipelineDir, $DocsDir) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Copy Phase 1 CLAUDE.md
Copy-Item -Path $Phase1Source -Destination $ProjectClaudeMd -Force

# Copy pipeline settings (includes SessionStart hook for auto-begin)
$SettingsSource = Join-Path $PipelineOffice "templates\pipeline-settings.json"
$SettingsDest = Join-Path $ProjectClaudeDir "settings.json"
Copy-Item -Path $SettingsSource -Destination $SettingsDest -Force

# NOTE: Not copying .mcp.json - MCP servers not needed for brainstorm phase
# and can cause "startup hook error" issues. Live Canvas can be enabled later if needed.

# Create auto-begin signal file (SessionStart hook will detect this)
$AutoBeginFile = Join-Path $ProjectPipelineDir "auto-begin.txt"
"BEGIN" | Out-File -FilePath $AutoBeginFile -Encoding ASCII -NoNewline

# Write project path to temp file for hook to read (hook may run from different dir)
$TempPathFile = Join-Path $env:TEMP "pipeline-current-project.txt"
$ProjectPath | Out-File -FilePath $TempPathFile -Encoding ASCII -NoNewline

# Create manifest
$ProjectName = Split-Path $ProjectPath -Leaf
$Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"

$Manifest = @{
    version = "11.0.0"
    project = @{
        name = $ProjectName
        path = $ProjectPath
    }
    stack = $null
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

Write-Host ""
Write-Host "Phase 1 | $ProjectName" -ForegroundColor Cyan

# Spawn Claude in a NEW Windows Terminal window
$spawnScript = Join-Path $PipelineOffice "lib\spawn-orchestrator-wt.ps1"
$spawnOutput = & $spawnScript -ProjectPath $ProjectPath -Title "Brainstorm | $ProjectName" 2>&1 | Out-String

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
    Write-Host "Claude may still start - check the new terminal window" -ForegroundColor Gray
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
