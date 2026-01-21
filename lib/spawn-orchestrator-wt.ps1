param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$Title = "Orchestrator"
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineDir = Join-Path $ProjectPath ".pipeline"
$pidFilePath = Join-Path $pipelineDir "orchestrator-powershell-pid.txt"

# Generate unique window name based on timestamp
$windowName = "Pipeline-$(Get-Date -Format 'HHmmss')"

# Ensure .pipeline directory exists
if (-not (Test-Path $pipelineDir)) {
    New-Item -ItemType Directory -Path $pipelineDir -Force | Out-Null
}

# Save window name for other scripts to use
$windowNameFile = Join-Path $pipelineDir "wt-window-name.txt"
$windowName | Out-File -FilePath $windowNameFile -Encoding ASCII -NoNewline

# Write project path to temp file for SessionStart hook
$tempProjectFile = Join-Path $env:TEMP "pipeline-current-project.txt"
$ProjectPath | Out-File -FilePath $tempProjectFile -Encoding ASCII -NoNewline

# Get PowerShell PIDs BEFORE spawning (silent)
$beforePids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)

# Build the command that runs inside the WT window
$psCommand = @"
`$PID | Out-File -FilePath '$pidFilePath' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = '$Title'
& '$claudePath' --dangerously-skip-permissions
"@

# Encode the command in Base64 for safe passing
$bytes = [System.Text.Encoding]::Unicode.GetBytes($psCommand)
$encodedCommand = [Convert]::ToBase64String($bytes)

# Spawn new Windows Terminal NAMED window with orchestrator
# Using -w to create a named window that other panes can join
$wtArgs = @(
    "-w", $windowName,
    "new-tab",
    "--title", "`"$Title`"",
    "-d", "`"$ProjectPath`"",
    "powershell.exe", "-NoExit", "-EncodedCommand", $encodedCommand
)
Start-Process wt.exe -ArgumentList $wtArgs

Write-Host "Created named window: $windowName"

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

# PID is now saved by the spawned process itself (via encoded command)
# But we can also try to detect it here as backup
if (-not (Test-Path $pidFilePath) -and $orchestratorPid) {
    $orchestratorPid | Out-File -FilePath $pidFilePath -Encoding ASCII -NoNewline
}

# Output for capturing
Write-Output "PID:$orchestratorPid"
Write-Output "WINDOW:$windowName"
