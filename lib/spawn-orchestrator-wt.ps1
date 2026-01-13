param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$Title = "Pipeline Orchestrator v11"
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pidFilePath = Join-Path $ProjectPath ".pipeline\orchestrator-powershell-pid.txt"

Write-Host "=========================================="
Write-Host "  spawn-orchestrator-wt.ps1"
Write-Host "  Spawning Orchestrator"
Write-Host "=========================================="
Write-Host "Project: $ProjectPath"
Write-Host "Title: $Title"

# Get PowerShell PIDs BEFORE spawning
$beforePids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
Write-Host "PowerShell PIDs before: $($beforePids -join ', ')"

# Build the command that runs inside the WT window
$psCommand = @"
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = '$Title'
& '$claudePath' --dangerously-skip-permissions
"@

# Encode the command in Base64 for safe passing
$bytes = [System.Text.Encoding]::Unicode.GetBytes($psCommand)
$encodedCommand = [Convert]::ToBase64String($bytes)

# Spawn new Windows Terminal window with orchestrator
Write-Host "Spawning Windows Terminal window..."
$wtArgs = @(
    "new-tab",
    "--title", "`"$Title`"",
    "-d", "`"$ProjectPath`"",
    "powershell.exe", "-NoExit", "-EncodedCommand", $encodedCommand
)

Write-Host "WT args: $($wtArgs -join ' ')"
Start-Process wt.exe -ArgumentList $wtArgs

# Wait for the new PowerShell process to start
Start-Sleep -Seconds 3

# Get PowerShell PIDs AFTER spawning
$afterPids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
Write-Host "PowerShell PIDs after: $($afterPids -join ', ')"

# Find the new PID
$newPids = $afterPids | Where-Object { $_ -notin $beforePids }
Write-Host "New PowerShell PIDs: $($newPids -join ', ')"

$orchestratorPid = $null
if ($newPids.Count -eq 1) {
    $orchestratorPid = $newPids[0]
} elseif ($newPids.Count -gt 1) {
    # Multiple new PIDs - take the most recent one
    $orchestratorPid = $newPids[-1]
    Write-Host "Multiple new PIDs found, using most recent: $orchestratorPid"
} else {
    Write-Host "WARNING: Could not identify orchestrator PowerShell PID"
}

# Save PID to file for later use
if ($orchestratorPid) {
    # Ensure .pipeline directory exists
    $pipelineDir = Join-Path $ProjectPath ".pipeline"
    if (-not (Test-Path $pipelineDir)) {
        New-Item -ItemType Directory -Path $pipelineDir -Force | Out-Null
    }

    $orchestratorPid | Out-File -FilePath $pidFilePath -Encoding ASCII -NoNewline
    Write-Host "Orchestrator PID saved to: $pidFilePath"
    Write-Host "ORCHESTRATOR_PID=$orchestratorPid"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  Orchestrator window spawned!"
Write-Host "  PID: $orchestratorPid"
Write-Host "=========================================="
Write-Host ""

# Output PID for capturing
Write-Output "PID:$orchestratorPid"
