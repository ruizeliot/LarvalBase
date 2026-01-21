param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$DashboardVersion = "auto"
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$pipelineDir = Join-Path $ProjectPath ".pipeline"

# Read window name
$windowNameFile = Join-Path $pipelineDir "wt-window-name.txt"
if (-not (Test-Path $windowNameFile)) {
    Write-Host "ERROR: Window name file not found. Run orchestrator first." -ForegroundColor Red
    exit 1
}
$windowName = (Get-Content $windowNameFile).Trim()

# Read orchestrator PID for dashboard to reference
$orchPidFile = Join-Path $pipelineDir "orchestrator-powershell-pid.txt"
$orchPid = "0"
if (Test-Path $orchPidFile) {
    $orchPid = (Get-Content $orchPidFile).Trim()
}

# Write project path to temp file for SessionStart hook
$tempProjectFile = Join-Path $env:TEMP "pipeline-current-project.txt"
$ProjectPath | Out-File -FilePath $tempProjectFile -Encoding ASCII -NoNewline

# Dashboard script mapping by version
$dashboardScripts = @{
    "v9" = "dashboard-v2.cjs"
    "v10" = "dashboard-v3.cjs"
    "v11" = "dashboard-runner-v11.cjs"
}

# Auto-detect version from manifest if needed
if ($DashboardVersion -eq "auto") {
    $manifestPath = Join-Path $ProjectPath ".pipeline\manifest.json"
    if (Test-Path $manifestPath) {
        try {
            $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
            $manifestVersion = $manifest.version
            if ($manifestVersion -match "^11") {
                $DashboardVersion = "v11"
            } elseif ($manifestVersion -match "^10") {
                $DashboardVersion = "v10"
            } else {
                $DashboardVersion = "v9"
            }
        } catch {
            $DashboardVersion = "v11"
        }
    } else {
        $DashboardVersion = "v11"
    }
}

$dashboardScriptName = $dashboardScripts[$DashboardVersion]
$dashboardScript = Join-Path $pipelineOffice "lib\$dashboardScriptName"

# PID file
$dashboardPidFile = Join-Path $pipelineDir "dashboard-pid.txt"
if (Test-Path $dashboardPidFile) { Remove-Item $dashboardPidFile -Force }

# Dashboard command
$dashboardCmd = @"
`$PID | Out-File -FilePath '$dashboardPidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = 'Dashboard'
node '$dashboardScript' '$ProjectPath' $orchPid
"@
$dashboardBytes = [System.Text.Encoding]::Unicode.GetBytes($dashboardCmd)
$dashboardEncoded = [Convert]::ToBase64String($dashboardBytes)

Write-Host "Adding Dashboard pane to window: $windowName"

# Split orchestrator pane vertically - dashboard appears on RIGHT (50%)
$wtArgs = @(
    "-w", $windowName,
    "split-pane",
    "-V",
    "-s", "0.5",
    "--title", "Dashboard",
    "powershell.exe", "-NoExit", "-EncodedCommand", $dashboardEncoded
)
Start-Process wt.exe -ArgumentList $wtArgs

Start-Sleep -Seconds 2

# Wait for dashboard PID
$maxWait = 10
$waited = 0
while (-not (Test-Path $dashboardPidFile) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
}

$dashboardPid = $null
if (Test-Path $dashboardPidFile) {
    $dashboardPid = [int](Get-Content $dashboardPidFile).Trim()
    Write-Host "Dashboard PID: $dashboardPid"
}

Write-Host "Dashboard pane added"
Write-Output "PID:$dashboardPid"
