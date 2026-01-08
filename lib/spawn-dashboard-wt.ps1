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

# Build the command that runs inside the WT pane
$psCommand = @"
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = '$dashboardTitle'
Write-Host 'Dashboard starting...'
node '$dashboardScript' '$ProjectPath' $OrchestratorPID
"@

# Encode the command in Base64 for safe passing
$bytes = [System.Text.Encoding]::Unicode.GetBytes($psCommand)
$encodedCommand = [Convert]::ToBase64String($bytes)

# Get PowerShell PIDs before spawning
$beforePids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
Write-Host "PowerShell PIDs before spawn: $($beforePids -join ', ')"

# Spawn NEW Windows Terminal window with Dashboard pane
# Using 'new-window' explicitly to ensure a new window is created
Write-Host "Creating new Windows Terminal window..."
$wtArgs = @(
    "--title", "Pipeline v10.0",
    "new-window",
    "--title", $dashboardTitle,
    "powershell.exe", "-NoExit", "-EncodedCommand", $encodedCommand
)
Start-Process wt.exe -ArgumentList $wtArgs

# Wait for PowerShell process to start
Start-Sleep -Seconds 2

# Get PowerShell PIDs after spawning
$afterPids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
Write-Host "PowerShell PIDs after spawn: $($afterPids -join ', ')"

# Find the new PID (the one that wasn't there before)
$newPids = $afterPids | Where-Object { $_ -notin $beforePids }
Write-Host "New PowerShell PIDs: $($newPids -join ', ')"

$dashboardPid = $null
if ($newPids.Count -eq 1) {
    $dashboardPid = $newPids[0]
    Write-Host "Dashboard PowerShell PID: $dashboardPid"
} elseif ($newPids.Count -gt 1) {
    # Multiple new PIDs - take the most recent one
    $dashboardPid = $newPids[-1]
    Write-Host "Multiple new PIDs found, using most recent: $dashboardPid"
} else {
    Write-Host "WARNING: Could not identify dashboard PowerShell PID"
    # Try to find by window title as fallback
    $processes = Get-Process -Name powershell -ErrorAction SilentlyContinue
    foreach ($p in $processes) {
        if ($p.MainWindowTitle -like "*$dashboardTitle*") {
            $dashboardPid = $p.Id
            Write-Host "Found by title: $dashboardPid"
            break
        }
    }
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
