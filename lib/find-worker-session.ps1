# find-worker-session.ps1 - Find the session ID of a worker by spawn time and phase command
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,
    
    [Parameter(Mandatory=$true)]
    [string]$PhaseCommand,
    
    [Parameter(Mandatory=$false)]
    [string]$AfterTime  # ISO timestamp - find sessions created after this time
)

# Encode project path to match Claude's folder naming
function Encode-ProjectPath {
    param([string]$path)
    $resolved = (Resolve-Path $path).Path
    $encoded = $resolved -replace '\', '/' -replace ':', '-' -replace ' ', '-' -replace '/', '-'
    if ($encoded.StartsWith('-')) { $encoded = $encoded.Substring(1) }
    return $encoded
}

$claudeProjectsDir = Join-Path $env:USERPROFILE ".claude\projects"
$encodedPath = Encode-ProjectPath $ProjectPath
$projectTranscriptsDir = Join-Path $claudeProjectsDir $encodedPath

if (-not (Test-Path $projectTranscriptsDir)) {
    Write-Error "Project transcripts not found: $projectTranscriptsDir"
    exit 1
}

# Get all .jsonl files (excluding agent-* files)
$transcripts = Get-ChildItem -Path $projectTranscriptsDir -Filter "*.jsonl" | 
    Where-Object { $_.Name -notlike "agent-*" }

# Filter by time if provided
if ($AfterTime) {
    $afterDateTime = [DateTime]::Parse($AfterTime)
    $transcripts = $transcripts | Where-Object { $_.LastWriteTime -gt $afterDateTime }
}

# Sort by last write time descending (newest first)
$transcripts = $transcripts | Sort-Object LastWriteTime -Descending

# Search for the phase command in each transcript
foreach ($transcript in $transcripts) {
    $content = Get-Content $transcript.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match [regex]::Escape($PhaseCommand)) {
        # Found it! Extract session ID from filename
        $sessionId = $transcript.BaseName
        
        # Output as JSON
        $result = @{
            sessionId = $sessionId
            transcriptPath = $transcript.FullName
            lastModified = $transcript.LastWriteTime.ToString("o")
            phaseCommand = $PhaseCommand
        }
        $result | ConvertTo-Json -Compress
        exit 0
    }
}

Write-Error "No session found for phase command: $PhaseCommand"
exit 1
