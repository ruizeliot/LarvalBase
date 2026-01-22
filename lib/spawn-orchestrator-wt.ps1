param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$false)]
    [string]$Title = "Orchestrator"
)

# Resolve relative path to absolute path
$ProjectPath = (Resolve-Path $ProjectPath).Path

$claudePath = "$env:APPDATA\npm\claude.cmd"
$pipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$pipelineDir = Join-Path $ProjectPath ".pipeline"
$pidFilePath = Join-Path $pipelineDir "orchestrator-powershell-pid.txt"

# ============ ISOLATED DIRECTORY SETUP ============
# Orchestrator runs in its own isolated directory with its own CLAUDE.md
$orchestratorDir = Join-Path $pipelineDir "orchestrator"
$orchestratorClaudeDir = Join-Path $orchestratorDir ".claude"

# Generate unique window name based on UUID
$uuid = [guid]::NewGuid().ToString().Substring(0, 8)
$windowName = "pipeline-$uuid"

# Ensure directories exist
if (-not (Test-Path $pipelineDir)) {
    New-Item -ItemType Directory -Path $pipelineDir -Force | Out-Null
}
if (-not (Test-Path $orchestratorDir)) {
    New-Item -ItemType Directory -Path $orchestratorDir -Force | Out-Null
}
if (-not (Test-Path $orchestratorClaudeDir)) {
    New-Item -ItemType Directory -Path $orchestratorClaudeDir -Force | Out-Null
}

# Copy orchestrator CLAUDE.md template
$orchestratorTemplate = Join-Path $pipelineOffice "claude-md\orchestrator-v11.md"
$orchestratorClaudeMd = Join-Path $orchestratorClaudeDir "CLAUDE.md"

if (Test-Path $orchestratorTemplate) {
    # Read template and inject PROJECT_PATH
    $templateContent = Get-Content $orchestratorTemplate -Raw

    # Convert Windows paths to Git Bash format: C:\path -> /c/path
    $projectPathUnix = $ProjectPath -replace '\\', '/'
    $projectPathUnix = $projectPathUnix -replace '^([A-Za-z]):', '/$1'
    $projectPathUnix = $projectPathUnix.ToLower().Substring(0,2) + $projectPathUnix.Substring(2)
    $pipelineDirUnix = $pipelineDir -replace '\\', '/'
    $pipelineDirUnix = $pipelineDirUnix -replace '^([A-Za-z]):', '/$1'
    $pipelineDirUnix = $pipelineDirUnix.ToLower().Substring(0,2) + $pipelineDirUnix.Substring(2)

    # Build the context prefix that goes at the start of every bash command
    $orchestratorDirUnix = $orchestratorDir -replace '\\', '/'
    $orchestratorDirUnix = $orchestratorDirUnix -replace '^([A-Za-z]):', '/$1'
    $orchestratorDirUnix = $orchestratorDirUnix.ToLower().Substring(0,2) + $orchestratorDirUnix.Substring(2)

    $injectedContent = @"
# Project Context (Auto-Injected)

**IMPORTANT: You are running in an isolated directory.**

## CRITICAL: Use LITERAL Paths in ALL Bash Commands

**Claude Code has a bash bug where variables don't expand in pipes. NEVER use variables like `"`$PROJECT_PATH`" or `"`$PIPELINE_DIR`".**

**ALWAYS use these literal paths directly (copy-paste):**

| What | Literal Path (USE THIS) |
|------|-------------------------|
| Project | ``$projectPathUnix`` |
| Pipeline | ``$pipelineDirUnix`` |
| Manifest | ``$pipelineDirUnix/manifest.json`` |

## Examples

**Check if manifest exists:**
``````bash
[ -f "$pipelineDirUnix/manifest.json" ] && echo "FOUND" || echo "NOT FOUND"
``````

**Read manifest with jq:**
``````bash
cat "$pipelineDirUnix/manifest.json" | jq -r '.currentPhase'
``````

**WRONG (variables don't work):**
``````bash
# DON'T DO THIS - variables fail in Claude Code bash:
export PIPELINE_DIR="..." && cat "`$PIPELINE_DIR/manifest.json"
``````

---

"@
    # Replace variable placeholders in template with literal paths
    # This is required because Claude Code's bash has a quirk where variable expansion
    # fails when piping (e.g., cat "$VAR/file" | jq fails but cat "/literal/path/file" | jq works)
    $templateContent = $templateContent -replace '\$PROJECT_PATH', $projectPathUnix
    $templateContent = $templateContent -replace '\$PIPELINE_DIR', $pipelineDirUnix
    $templateContent = $templateContent -replace '\$ORCHESTRATOR_DIR', $orchestratorDirUnix

    # Combine injected content with processed template
    $fullContent = $injectedContent + "`n" + $templateContent
    $fullContent | Out-File -FilePath $orchestratorClaudeMd -Encoding UTF8
    Write-Host "Created orchestrator CLAUDE.md with project context and literal paths"
} else {
    Write-Host "WARNING: Orchestrator template not found: $orchestratorTemplate" -ForegroundColor Yellow
}

# Copy pipeline settings.json (includes SessionStart hook for auto-begin)
$settingsSource = Join-Path $pipelineOffice "templates\pipeline-settings.json"
$settingsDest = Join-Path $orchestratorClaudeDir "settings.json"
if (Test-Path $settingsSource) {
    Copy-Item -Path $settingsSource -Destination $settingsDest -Force
    Write-Host "Copied pipeline settings.json to orchestrator"
}

# Create context.sh for bash commands to source
$contextShPath = Join-Path $orchestratorDir "context.sh"
# Convert Windows paths to Git Bash format: C:\path -> /c/path
$projectPathUnix = $ProjectPath -replace '\\', '/'
$projectPathUnix = $projectPathUnix -replace '^([A-Za-z]):', '/$1'
$projectPathUnix = $projectPathUnix.ToLower().Substring(0,2) + $projectPathUnix.Substring(2)
$pipelineDirUnix = $pipelineDir -replace '\\', '/'
$pipelineDirUnix = $pipelineDirUnix -replace '^([A-Za-z]):', '/$1'
$pipelineDirUnix = $pipelineDirUnix.ToLower().Substring(0,2) + $pipelineDirUnix.Substring(2)
$contextShContent = @"
#!/bin/bash
# Pipeline context - source this before running commands
export PROJECT_PATH="$projectPathUnix"
export PIPELINE_DIR="$pipelineDirUnix"

"@
# Write with Unix line endings (LF only) - critical for bash to source correctly
# The trailing newline above is required for bash to properly parse the last export
$contextShContent = $contextShContent -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($contextShPath, $contextShContent)
Write-Host "Created context.sh for bash environment"

# Save window name for other scripts to use
$windowNameFile = Join-Path $pipelineDir "wt-window-name.txt"
$windowName | Out-File -FilePath $windowNameFile -Encoding ASCII -NoNewline

# Save project path for reference
$projectPathFile = Join-Path $pipelineDir "project-path.txt"
$ProjectPath | Out-File -FilePath $projectPathFile -Encoding ASCII -NoNewline

# Write project path to temp file for SessionStart hook
$tempProjectFile = Join-Path $env:TEMP "pipeline-current-project.txt"
$ProjectPath | Out-File -FilePath $tempProjectFile -Encoding ASCII -NoNewline

# Get PowerShell PIDs BEFORE spawning (silent)
$beforePids = @(Get-Process -Name powershell -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)

# Build the command that runs inside the WT window
# NOTE: Orchestrator runs in ISOLATED directory, not project root
$psCommand = @"
`$PID | Out-File -FilePath '$pidFilePath' -Encoding UTF8 -NoNewline
Set-Location -Path '$orchestratorDir'
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
    "-d", "`"$orchestratorDir`"",
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
