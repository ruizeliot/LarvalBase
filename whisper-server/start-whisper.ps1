<#
.SYNOPSIS
    Start the Whisper transcription server

.DESCRIPTION
    Starts the local Whisper server for speech-to-text transcription.
    Supports English and French with auto-detection.

.PARAMETER Model
    Whisper model size: tiny, base, small, medium, large-v2, large-v3
    Default: base (good balance of speed/quality)

.PARAMETER Port
    Port to listen on. Default: 5000

.PARAMETER Preload
    Preload the model on startup (slower start, faster first request)

.PARAMETER Background
    Run in background (returns immediately)

.EXAMPLE
    .\start-whisper.ps1

.EXAMPLE
    .\start-whisper.ps1 -Model small -Port 5001 -Preload

.EXAMPLE
    .\start-whisper.ps1 -Background
#>

param(
    [ValidateSet("tiny", "base", "small", "medium", "large-v2", "large-v3")]
    [string]$Model = "base",

    [int]$Port = 5000,

    [switch]$Preload,

    [switch]$Background
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if Python is available
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "ERROR: Python not found. Please install Python 3.9+." -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
$venvPath = Join-Path $ScriptDir "venv"
$venvActivate = Join-Path $venvPath "Scripts\Activate.ps1"

if (-not (Test-Path $venvActivate)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath

    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & $venvActivate
    pip install -r (Join-Path $ScriptDir "requirements.txt")
} else {
    & $venvActivate
}

# Set environment variables
$env:WHISPER_MODEL = $Model
$env:WHISPER_PORT = $Port
$env:WHISPER_HOST = "127.0.0.1"
if ($Preload) {
    $env:WHISPER_PRELOAD = "true"
}

Write-Host ""
Write-Host "Whisper Transcription Server" -ForegroundColor Cyan
Write-Host "Model: $Model" -ForegroundColor Gray
Write-Host "Port: $Port" -ForegroundColor Gray
Write-Host "URL: http://127.0.0.1:$Port" -ForegroundColor Gray
Write-Host "API Docs: http://127.0.0.1:$Port/docs" -ForegroundColor Gray
Write-Host ""

$serverScript = Join-Path $ScriptDir "server.py"

if ($Background) {
    Write-Host "Starting in background..." -ForegroundColor Yellow

    # Create a PID file location
    $pidFile = Join-Path $ScriptDir "whisper.pid"

    # Start in background
    $process = Start-Process -FilePath python -ArgumentList $serverScript -PassThru -WindowStyle Hidden
    $process.Id | Out-File -FilePath $pidFile -Encoding UTF8

    Write-Host "Server started with PID: $($process.Id)" -ForegroundColor Green
    Write-Host "PID file: $pidFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To stop: Stop-Process -Id $($process.Id)" -ForegroundColor Gray
} else {
    # Run in foreground
    python $serverScript
}
