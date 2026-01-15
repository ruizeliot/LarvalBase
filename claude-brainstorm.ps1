<#
.SYNOPSIS
    Start Pipeline Brainstorming Session

.DESCRIPTION
    Launches Claude with Phase 1 brainstorming.
    Run from any project directory - no arguments needed.

.EXAMPLE
    cd my-project
    claude-brainstorm
#>

param(
    [Parameter(Position=0)]
    [string]$ProjectPath = (Get-Location).Path
)

# Resolve paths
$PipelineOffice = "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office"
$Phase1Source = Join-Path $PipelineOffice "claude-md\phase-1.md"

# Use current directory if not specified
if (-not $ProjectPath -or $ProjectPath -eq ".") {
    $ProjectPath = (Get-Location).Path
}

# Resolve relative paths
if (-not [System.IO.Path]::IsPathRooted($ProjectPath)) {
    $ProjectPath = Join-Path (Get-Location).Path $ProjectPath
}

$ProjectClaudeDir = Join-Path $ProjectPath ".claude"
$ProjectClaudeMd = Join-Path $ProjectClaudeDir "CLAUDE.md"
$ProjectPipelineDir = Join-Path $ProjectPath ".pipeline"
$DocsDir = Join-Path $ProjectPath "docs"
$ManifestPath = Join-Path $ProjectPipelineDir "manifest.json"

# Validate source
if (-not (Test-Path $Phase1Source)) {
    Write-Host "ERROR: Phase 1 CLAUDE.md not found: $Phase1Source" -ForegroundColor Red
    exit 1
}

# Create directories
@($ProjectClaudeDir, $ProjectPipelineDir, $DocsDir) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

# Copy Phase 1 CLAUDE.md
Copy-Item -Path $Phase1Source -Destination $ProjectClaudeMd -Force

# Copy MCP config (for Live Canvas support)
$McpSource = Join-Path $PipelineOffice ".mcp.json"
$McpDest = Join-Path $ProjectPath ".mcp.json"
if (Test-Path $McpSource) {
    Copy-Item -Path $McpSource -Destination $McpDest -Force
}

# Create manifest (only if doesn't exist or force refresh)
$ProjectName = Split-Path $ProjectPath -Leaf
$Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"

$Manifest = @{
    version = "11.0.0"
    project = @{
        name = $ProjectName
        path = $ProjectPath
    }
    stack = $null
    mode = "new"
    status = "brainstorming"
    currentPhase = "1"
    phases = @{
        "1" = @{ status = "in_progress"; startedAt = $Timestamp }
        "2" = @{ status = "pending" }
        "3" = @{ status = "pending" }
        "4" = @{ status = "pending" }
        "5" = @{ status = "pending" }
    }
    createdAt = $Timestamp
} | ConvertTo-Json -Depth 10

$Manifest | Out-File -FilePath $ManifestPath -Encoding UTF8

# Launch Claude
Write-Host ""
Write-Host "Brainstorm | $ProjectName" -ForegroundColor Cyan
Write-Host ""
claude
