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

# Get PowerShell PIDs BEFORE spawning (silent)
$beforePids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)

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
$wtArgs = @(
    "new-tab",
    "--title", "`"$Title`"",
    "-d", "`"$ProjectPath`"",
    "powershell.exe", "-NoExit", "-EncodedCommand", $encodedCommand
)
Start-Process wt.exe -ArgumentList $wtArgs

# Wait for the new PowerShell process to start
Start-Sleep -Seconds 3

# Get PowerShell PIDs AFTER spawning
$afterPids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)

# Find the new PID
$newPids = $afterPids | Where-Object { $_ -notin $beforePids }

$orchestratorPid = $null
if ($newPids.Count -eq 1) {
    $orchestratorPid = $newPids[0]
} elseif ($newPids.Count -gt 1) {
    $orchestratorPid = $newPids[-1]
} else {
    Write-Host "WARNING: Could not identify orchestrator PID" -ForegroundColor Yellow
}

# Save PID to file for later use
if ($orchestratorPid) {
    # Ensure .pipeline directory exists
    $pipelineDir = Join-Path $ProjectPath ".pipeline"
    if (-not (Test-Path $pipelineDir)) {
        New-Item -ItemType Directory -Path $pipelineDir -Force | Out-Null
    }

    $orchestratorPid | Out-File -FilePath $pidFilePath -Encoding ASCII -NoNewline
}

# Output PID for capturing (silent - captured by caller)
Write-Output "PID:$orchestratorPid"
