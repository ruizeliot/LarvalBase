# Windows Pipeline Supervisor
# Runs pipeline phases locally on Windows using Windows Terminal
# Usage: .\windows-supervisor.ps1 -ProjectPath "path" [-Mode feature]

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [ValidateSet("new", "feature")]
    [string]$Mode = "new",

    [string]$StartPhase = "0a"
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Resolve project path
$ProjectPath = Resolve-Path $ProjectPath -ErrorAction SilentlyContinue
if (-not $ProjectPath) {
    Write-Err "Project path not found: $ProjectPath"
    exit 1
}

$ProjectName = Split-Path $ProjectPath -Leaf
$PipelineDir = Join-Path $ProjectPath ".pipeline"
$ManifestPath = Join-Path $PipelineDir "manifest.json"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host " Pipeline Supervisor - Windows Local Mode" -ForegroundColor Magenta
Write-Host " Project: $ProjectName" -ForegroundColor Magenta
Write-Host " Mode: $Mode" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# Create .pipeline directory
if (-not (Test-Path $PipelineDir)) {
    New-Item -ItemType Directory -Path $PipelineDir -Force | Out-Null
    Write-Info "Created .pipeline directory"
}

# Define phases
if ($Mode -eq "feature") {
    $Phases = @(
        @{ Id = "0a"; Name = "Brainstorm"; Cmd = "/0a-pipeline-brainstorm-feature-v6.0" },
        @{ Id = "0b"; Name = "Technical"; Cmd = "/0b-pipeline-technical-feature-v6.0" },
        @{ Id = "1"; Name = "Bootstrap"; Cmd = "/1-pipeline-bootstrap-feature-v6.0" },
        @{ Id = "2"; Name = "Implement"; Cmd = "/2-pipeline-implementEpic-feature-v6.0" },
        @{ Id = "3"; Name = "Finalize"; Cmd = "/3-pipeline-finalize-feature-v6.0" }
    )
} else {
    $Phases = @(
        @{ Id = "0a"; Name = "Brainstorm"; Cmd = "/0a-pipeline-brainstorm-v6.0" },
        @{ Id = "0b"; Name = "Technical"; Cmd = "/0b-pipeline-technical-v6.0" },
        @{ Id = "1"; Name = "Bootstrap"; Cmd = "/1-pipeline-bootstrap-v6.0" },
        @{ Id = "2"; Name = "Implement"; Cmd = "/2-pipeline-implementEpic-v6.0" },
        @{ Id = "3"; Name = "Finalize"; Cmd = "/3-pipeline-finalize-v6.0" }
    )
}

# Initialize manifest
$RunId = Get-Date -Format "yyyyMMdd-HHmmss"
$Manifest = @{
    projectName = $ProjectName
    projectPath = $ProjectPath.Path
    mode = $Mode
    currentPhase = $StartPhase
    status = "initializing"
    runId = $RunId
    startedAt = (Get-Date -Format "o")
    phases = @{}
}

foreach ($phase in $Phases) {
    $Manifest.phases[$phase.Id] = @{
        status = "pending"
        command = $phase.Cmd
    }
}

$Manifest | ConvertTo-Json -Depth 5 | Set-Content $ManifestPath -Encoding UTF8
Write-Success "Initialized manifest: $ManifestPath"

# Instructions
Write-Host ""
Write-Host "┌─────────────────────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "│ SUPERVISOR READY - Open TWO terminals:                      │" -ForegroundColor Green
Write-Host "├─────────────────────────────────────────────────────────────┤" -ForegroundColor Green
Write-Host "│                                                             │" -ForegroundColor Green
Write-Host "│ TERMINAL 1 (Supervisor):                                    │" -ForegroundColor Yellow
Write-Host "│   cd `"$ProjectPath`"" -ForegroundColor White
Write-Host "│   claude                                                    │" -ForegroundColor White
Write-Host "│   Then type: /manager-pipeline                              │" -ForegroundColor Cyan
Write-Host "│                                                             │" -ForegroundColor Green
Write-Host "│ TERMINAL 2 (Worker):                                        │" -ForegroundColor Yellow
Write-Host "│   cd `"$ProjectPath`"" -ForegroundColor White
Write-Host "│   claude                                                    │" -ForegroundColor White
Write-Host "│   Then type: $($Phases[0].Cmd)" -ForegroundColor Cyan
Write-Host "│                                                             │" -ForegroundColor Green
Write-Host "└─────────────────────────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""

# Ask to open terminals
$response = Read-Host "Open Windows Terminal with both tabs now? (Y/n)"
if ($response -ne "n" -and $response -ne "N") {
    # Convert path for Git Bash
    $GitBashPath = $ProjectPath.Path -replace '\\', '/' -replace '^([A-Z]):', '/$1'.ToLower()

    # Open Windows Terminal with two tabs
    $wtArgs = @(
        "new-tab",
        "--title", "Supervisor",
        "-d", "`"$($ProjectPath.Path)`"",
        "cmd", "/k", "echo Supervisor Terminal - Run: claude then /manager-pipeline",
        ";",
        "new-tab",
        "--title", "Worker",
        "-d", "`"$($ProjectPath.Path)`"",
        "cmd", "/k", "echo Worker Terminal - Run: claude then $($Phases[0].Cmd)"
    )

    Start-Process "wt" -ArgumentList $wtArgs
    Write-Success "Opened Windows Terminal with Supervisor and Worker tabs"
}

Write-Host ""
Write-Success "Manifest location: $ManifestPath"
Write-Info "Current phase: $StartPhase"
Write-Host ""
