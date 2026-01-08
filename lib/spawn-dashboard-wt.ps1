param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$OrchestratorPID
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

Write-Host "=== spawn-dashboard-wt.ps1 ==="
Write-Host "Spawning dashboard in Windows Terminal for: $ProjectPath"
Write-Host "Orchestrator PID: $OrchestratorPID"

# Use central dashboard from Pipeline-Office/lib/
$dashboardScript = Join-Path $PSScriptRoot "dashboard-v3.cjs"
$dashboardTitle = "Pipeline-Dashboard"

# PID file for reliable PID detection
$pipelineDir = Join-Path $ProjectPath ".pipeline"
$pidFile = Join-Path $pipelineDir "dashboard-pid.txt"
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
}

# Build the command that runs inside the WT pane
# First writes PID to file, then runs dashboard
$psCommand = @"
`$PID | Out-File -FilePath '$pidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = '$dashboardTitle'
Write-Host 'Dashboard starting...'
node '$dashboardScript' '$ProjectPath' $OrchestratorPID
"@

# Encode the command in Base64 for safe passing
$bytes = [System.Text.Encoding]::Unicode.GetBytes($psCommand)
$encodedCommand = [Convert]::ToBase64String($bytes)

# Spawn NEW Windows Terminal window with Dashboard pane
# Using profile-based approach which works reliably (new-window powershell.exe doesn't)
Write-Host "Creating new Windows Terminal window..."
$wtCommand = "wt.exe -p `"Windows PowerShell`" -- powershell.exe -NoExit -EncodedCommand $encodedCommand"
cmd /c $wtCommand

# Wait for PID file to be created by spawned process
Write-Host "Waiting for dashboard to start..."
$maxWait = 15
$waited = 0
while (-not (Test-Path $pidFile) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
}

$dashboardPid = $null
if (Test-Path $pidFile) {
    $dashboardPid = [int](Get-Content $pidFile).Trim()
    Write-Host "Dashboard PowerShell PID: $dashboardPid"

    # Verify process exists
    $proc = Get-Process -Id $dashboardPid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Process verified: $($proc.ProcessName)"
    } else {
        Write-Host "WARNING: Process $dashboardPid not found"
        $dashboardPid = $null
    }
} else {
    Write-Host "WARNING: Could not identify dashboard PowerShell PID (timeout after $maxWait seconds)"
}

# Update manifest with wtMode flag
$manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
if (Test-Path $manifestPath) {
    try {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        $manifest.wtMode = $true
        $manifest.dashboardPid = $dashboardPid
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8
        Write-Host "Manifest updated with wtMode=true, dashboardPid=$dashboardPid"
    } catch {
        Write-Host "WARNING: Could not update manifest: $_"
    }
}

Write-Host "Dashboard spawned in Windows Terminal"
Write-Host ""

# Output JSON result for orchestrator to parse
$result = @{
    dashboardPid = $dashboardPid
    wtMode = $true
}
Write-Host "RESULT_JSON:$($result | ConvertTo-Json -Compress)"
