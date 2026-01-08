param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$claudeMdSource = "$pipelineOffice\claude-md\orchestrator.md"
$title = "Orchestrator"

# Convert Unix-style path from Git Bash to Windows path
if ($ProjectPath -match "^/([a-zA-Z])/") {
    $ProjectPath = $ProjectPath -replace "^/([a-zA-Z])/", '$1:/'
    $ProjectPath = $ProjectPath -replace "/", "\"
}
# Also handle if it's already a Windows path but with forward slashes
$ProjectPath = $ProjectPath -replace "/", "\"

Write-Host "=========================================="
Write-Host "  Pipeline Launcher v10.0"
Write-Host "=========================================="
Write-Host ""
Write-Host "Project: $ProjectPath"
Write-Host ""

# Ensure .claude directory exists
$claudeDir = Join-Path $ProjectPath ".claude"
if (-not (Test-Path $claudeDir)) {
    New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null
    Write-Host "Created .claude directory"
}

# Ensure .pipeline directory exists (for PID file)
$pipelineDir = Join-Path $ProjectPath ".pipeline"
if (-not (Test-Path $pipelineDir)) {
    New-Item -ItemType Directory -Path $pipelineDir -Force | Out-Null
    Write-Host "Created .pipeline directory"
}

# Copy orchestrator CLAUDE.md
$claudeMdDest = Join-Path $claudeDir "CLAUDE.md"
Copy-Item $claudeMdSource $claudeMdDest -Force
Write-Host "Copied orchestrator.md to .claude/CLAUDE.md"

# PID file path - spawned process will write its PID here
$pidFile = Join-Path $pipelineDir "orchestrator-pid.txt"
if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
}

# Build the command that runs inside the WT window
# First writes PID to file, then runs Claude
$psCommand = @"
`$PID | Out-File -FilePath '$pidFile' -Encoding UTF8 -NoNewline
Set-Location -Path '$ProjectPath'
`$Host.UI.RawUI.WindowTitle = '$title'
& '$claudePath' --dangerously-skip-permissions
"@

# Encode the command in Base64 for safe passing
$bytes = [System.Text.Encoding]::Unicode.GetBytes($psCommand)
$encodedCommand = [Convert]::ToBase64String($bytes)

# Spawn Windows Terminal with orchestrator using profile-based approach
# Note: "new-window powershell.exe" doesn't work reliably, but "-p profile" does
Write-Host "Spawning Orchestrator in Windows Terminal..."
$wtCommand = "wt.exe -p `"Windows PowerShell`" -- powershell.exe -NoExit -EncodedCommand $encodedCommand"
cmd /c $wtCommand

# Wait for PID file to be created by spawned process
Write-Host "Waiting for orchestrator to start..."
$maxWait = 15
$waited = 0
while (-not (Test-Path $pidFile) -and $waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
}

$orchestratorPid = $null
if (Test-Path $pidFile) {
    $orchestratorPid = [int](Get-Content $pidFile).Trim()
    Write-Host "Orchestrator PowerShell PID: $orchestratorPid"

    # Verify process exists
    $proc = Get-Process -Id $orchestratorPid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Process verified: $($proc.ProcessName)"
    } else {
        Write-Host "WARNING: Process $orchestratorPid not found"
        $orchestratorPid = $null
    }
} else {
    Write-Host "WARNING: Could not identify orchestrator PowerShell PID (timeout after $maxWait seconds)"
}

Write-Host ""
Write-Host "=========================================="
Write-Host "  Orchestrator spawned successfully"
Write-Host "=========================================="
Write-Host ""
Write-Host "The orchestrator window is now open in Windows Terminal."
Write-Host "It will read its instructions from .claude/CLAUDE.md"
Write-Host ""
Write-Host "To start the pipeline, type in the orchestrator window:"
Write-Host "  /orchestrator-desktop-v10.0"
Write-Host ""

# Output JSON for easy parsing
$result = @{
    orchestratorPid = $orchestratorPid
    projectPath = $ProjectPath
    claudeMd = $claudeMdDest
    pidFile = $pidFile
    wtMode = $true
} | ConvertTo-Json -Compress

Write-Host "ORCHESTRATOR_INFO:$result"
