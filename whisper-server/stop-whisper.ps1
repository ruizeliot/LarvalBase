<#
.SYNOPSIS
    Stop the Whisper transcription server

.DESCRIPTION
    Stops the background Whisper server using the saved PID file.
#>

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $ScriptDir "whisper.pid"

if (-not (Test-Path $pidFile)) {
    Write-Host "No PID file found. Server may not be running." -ForegroundColor Yellow
    exit 0
}

$pid = Get-Content $pidFile -Raw
$pid = $pid.Trim()

try {
    $process = Get-Process -Id $pid -ErrorAction Stop
    Stop-Process -Id $pid -Force
    Write-Host "Stopped Whisper server (PID: $pid)" -ForegroundColor Green
    Remove-Item $pidFile -Force
} catch {
    Write-Host "Server not running (PID $pid not found)" -ForegroundColor Yellow
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
