# spawn-animation.ps1
# Spawns the animation player in a new terminal window
# Usage: powershell -File spawn-animation.ps1 <animation.json>

param(
    [Parameter(Mandatory=$true)]
    [string]$AnimationFile
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PlayerPath = Join-Path $ScriptDir "animation-player.cjs"

# Resolve to absolute path if relative
if (-not [System.IO.Path]::IsPathRooted($AnimationFile)) {
    $AnimationFile = Join-Path (Get-Location) $AnimationFile
}

# Check files exist
if (-not (Test-Path $PlayerPath)) {
    Write-Error "Animation player not found: $PlayerPath"
    exit 1
}

if (-not (Test-Path $AnimationFile)) {
    Write-Error "Animation file not found: $AnimationFile"
    exit 1
}

# Spawn in new window
$title = "Phase 1 Animation"
Start-Process cmd -ArgumentList "/c", "title $title && node `"$PlayerPath`" `"$AnimationFile`""

Write-Host "Animation spawned in new window" -ForegroundColor Green
