<#
.SYNOPSIS
    Spawns OBS Recorder in a new conhost window

.DESCRIPTION
    Launches the OBS recording automation script in a separate terminal window.
    The recorder will automatically start/stop OBS recording based on pipeline phase/epic transitions.

.PARAMETER ProjectPath
    Path to the project directory containing .pipeline/manifest.json

.PARAMETER OBSPassword
    Optional OBS WebSocket password (can also be set via OBS_PASSWORD env var)

.EXAMPLE
    .\spawn-obs-recorder.ps1 -ProjectPath "C:\Users\ahunt\Documents\IMT Claude\my-project"

.EXAMPLE
    .\spawn-obs-recorder.ps1 -ProjectPath "../my-project" -OBSPassword "mypassword"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$OBSPassword = ""
)

# Resolve paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RecorderScript = Join-Path $ScriptDir "obs-recorder.cjs"
$ResolvedProjectPath = Resolve-Path $ProjectPath -ErrorAction SilentlyContinue

if (-not $ResolvedProjectPath) {
    Write-Host "[ERROR] Project path not found: $ProjectPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $RecorderScript)) {
    Write-Host "[ERROR] OBS recorder script not found: $RecorderScript" -ForegroundColor Red
    exit 1
}

# Check if node is available
$NodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodePath) {
    Write-Host "[ERROR] Node.js not found in PATH" -ForegroundColor Red
    exit 1
}

# Build environment variables
$env:OBS_PASSWORD = $OBSPassword

# Build command
$NodeArgs = "`"$RecorderScript`" `"$ResolvedProjectPath`""

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║          SPAWNING OBS RECORDER                    ║" -ForegroundColor Red
Write-Host "╚═══════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""
Write-Host "  Project: $ResolvedProjectPath" -ForegroundColor Cyan
Write-Host "  Script:  $RecorderScript" -ForegroundColor Cyan
Write-Host ""

# Spawn in new conhost window
$ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo.FileName = "conhost.exe"
$ProcessInfo.Arguments = "node $NodeArgs"
$ProcessInfo.UseShellExecute = $true
$ProcessInfo.WorkingDirectory = $ScriptDir

# Pass environment variable
if ($OBSPassword) {
    $ProcessInfo.EnvironmentVariables["OBS_PASSWORD"] = $OBSPassword
}

try {
    $Process = [System.Diagnostics.Process]::Start($ProcessInfo)
    Write-Host "  [OK] OBS Recorder spawned (PID: $($Process.Id))" -ForegroundColor Green
    Write-Host ""

    # Return the PID for tracking
    return $Process.Id
}
catch {
    Write-Host "[ERROR] Failed to spawn OBS recorder: $_" -ForegroundColor Red
    exit 1
}
