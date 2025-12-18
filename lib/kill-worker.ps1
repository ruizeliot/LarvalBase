param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

# Kill worker process and stop OBS recording
# v9.0+: Centralized worker cleanup

Write-Host "Killing worker for project: $ProjectPath"

$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"

if (-not (Test-Path $manifestPath)) {
    Write-Host "ERROR: manifest.json not found at $manifestPath"
    exit 1
}

# Read manifest
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$workerPid = $manifest.workerPid
$conhostPid = $manifest.workerConhostPid

Write-Host "Worker PID: $workerPid, Conhost PID: $conhostPid"

# Stop OBS recording first (graceful)
Write-Host "Stopping OBS recording..."
$obsScript = Join-Path $PSScriptRoot "obs-control.cjs"
$obsResult = & node $obsScript stop $ProjectPath 2>&1
Write-Host "OBS result: $obsResult"

# Wait for OBS to finalize the file
Write-Host "Waiting 10 seconds for OBS to finalize..."
Start-Sleep -Seconds 10

# Kill worker process
if ($workerPid -and $workerPid -ne "null") {
    $workerProcess = Get-Process -Id $workerPid -ErrorAction SilentlyContinue
    if ($workerProcess) {
        Write-Host "Killing worker process: $workerPid"
        Stop-Process -Id $workerPid -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Worker process $workerPid already dead"
    }
}

# Kill conhost process
if ($conhostPid -and $conhostPid -ne "null") {
    $conhostProcess = Get-Process -Id $conhostPid -ErrorAction SilentlyContinue
    if ($conhostProcess) {
        Write-Host "Killing conhost process: $conhostPid"
        Stop-Process -Id $conhostPid -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "Conhost process $conhostPid already dead"
    }
}

# Update manifest to clear worker PIDs
$manifest.workerPid = $null
$manifest.workerConhostPid = $null
$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8

Write-Host "Worker killed and manifest updated"
