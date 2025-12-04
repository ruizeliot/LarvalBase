# Pipeline Windows Launcher
# Spawns Supervisor and Worker in separate Windows Terminal tabs
#
# Usage: .\pipeline-windows.ps1 -ProjectPath "path" [-Mode feature]

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [ValidateSet("new", "feature")]
    [string]$Mode = "feature"
)

$ErrorActionPreference = "Stop"

# Resolve path
$ProjectPath = (Resolve-Path $ProjectPath -ErrorAction Stop).Path
$ProjectName = Split-Path $ProjectPath -Leaf

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host " Pipeline Launcher (Windows)" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host " Project: $ProjectName" -ForegroundColor Cyan
Write-Host " Path: $ProjectPath" -ForegroundColor Cyan
Write-Host " Mode: $Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Initialize pipeline directory
$PipelineDir = Join-Path $ProjectPath ".pipeline"
if (-not (Test-Path $PipelineDir)) {
    New-Item -ItemType Directory -Path $PipelineDir -Force | Out-Null
}

# Initialize communication files
"idle" | Set-Content (Join-Path $PipelineDir "worker-status.txt")
"" | Set-Content (Join-Path $PipelineDir "worker-output.log")
"" | Set-Content (Join-Path $PipelineDir "supervisor-messages.txt")
"" | Set-Content (Join-Path $PipelineDir "worker-command.txt")

Write-Host "[OK] Initialized pipeline files" -ForegroundColor Green

# Create commands
$SupervisorCmd = "/supervisor-windows `"$ProjectPath`" --mode $Mode"
$WorkerCmd = "/worker-windows `"$ProjectPath`""

Write-Host ""
Write-Host "Launching Windows Terminal with Supervisor + Worker..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Supervisor command: $SupervisorCmd" -ForegroundColor DarkGray
Write-Host "Worker command: $WorkerCmd" -ForegroundColor DarkGray
Write-Host ""

# Launch Supervisor tab first
$supervisorArgs = "new-tab --title `"Supervisor`" -d `"$ProjectPath`" cmd /k `"echo Starting Supervisor... && claude --dangerously-skip-permissions \`"$SupervisorCmd\`"`""
Start-Process "wt" -ArgumentList $supervisorArgs

Write-Host "[OK] Supervisor tab launched" -ForegroundColor Green

# Wait a moment then launch Worker tab
Start-Sleep -Seconds 2

$workerArgs = "new-tab --title `"Worker`" -d `"$ProjectPath`" cmd /k `"echo Starting Worker... && claude --dangerously-skip-permissions \`"$WorkerCmd\`"`""
Start-Process "wt" -ArgumentList $workerArgs

Write-Host "[OK] Worker tab launched" -ForegroundColor Green

Write-Host ""
Write-Host "Both terminals launched!" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor files:" -ForegroundColor Cyan
Write-Host "  - $PipelineDir\worker-status.txt" -ForegroundColor DarkGray
Write-Host "  - $PipelineDir\worker-output.log" -ForegroundColor DarkGray
Write-Host "  - $PipelineDir\manifest.json" -ForegroundColor DarkGray
Write-Host ""
