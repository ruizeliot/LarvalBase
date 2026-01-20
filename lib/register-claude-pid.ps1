# Register Claude Code PID with Live Canvas for message injection
# This script finds the Claude Code process and registers its PID

param(
    [string]$PipelineDir = ".",
    [int]$ExplicitPid = 0
)

$claudePid = $null

# Method 1: Use explicit PID if provided
if ($ExplicitPid -gt 0) {
    $claudePid = $ExplicitPid
    Write-Host "Using explicit PID: $claudePid"
}

# Method 2: Trace parent process chain to find Claude Code
if (-not $claudePid) {
    Write-Host "Tracing parent process chain..."
    $currentPid = $PID
    $maxDepth = 10
    $depth = 0

    while ($depth -lt $maxDepth) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $currentPid" -ErrorAction SilentlyContinue
        if (-not $proc) { break }

        Write-Host "  Depth $depth : PID $currentPid - $($proc.Name)"

        # Check if this is Claude Code (node.exe with claude in command line)
        if ($proc.Name -eq 'node.exe' -and $proc.CommandLine -like '*claude*') {
            $claudePid = $proc.ProcessId
            Write-Host "Found Claude Code at depth $depth : PID $claudePid"
            break
        }

        # Move to parent
        $currentPid = $proc.ParentProcessId
        $depth++
    }
}

# Method 3: Fallback - find any Claude process (original behavior)
if (-not $claudePid) {
    Write-Host "Fallback: Finding first Claude process..."
    $proc = Get-CimInstance Win32_Process |
        Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*claude*' } |
        Select-Object -First 1

    if ($proc) {
        $claudePid = $proc.ProcessId
        Write-Host "Found Claude Code (fallback): PID $claudePid"
    }
}

if ($claudePid) {

    # Ensure .pipeline directory exists
    $pipelinePath = Join-Path $PipelineDir ".pipeline"
    if (-not (Test-Path $pipelinePath)) {
        New-Item -ItemType Directory -Path $pipelinePath -Force | Out-Null
    }

    # Write PID to file
    $pidFile = Join-Path $pipelinePath "claude.pid"
    $claudePid | Set-Content $pidFile -NoNewline
    Write-Host "Wrote PID $claudePid to $pidFile"

    # Register with Live Canvas API
    try {
        $body = @{ pid = $claudePid } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:3456/api/inject/pid" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "Registered PID $claudePid with Live Canvas API"
        Write-Host "Response: $($response | ConvertTo-Json -Compress)"
    } catch {
        Write-Host "Warning: Could not register with API (server may not be running): $_"
        Write-Host "PID still written to file - injection will work if server reads from file"
    }

    exit 0
} else {
    Write-Host "ERROR: Could not find Claude Code process"
    Write-Host ""
    Write-Host "Available node processes:"
    Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | ForEach-Object {
        $cmdLine = if ($_.CommandLine.Length -gt 100) { $_.CommandLine.Substring(0, 100) + "..." } else { $_.CommandLine }
        Write-Host "  PID: $($_.ProcessId) - $cmdLine"
    }
    Write-Host ""
    Write-Host "You can manually register by running:"
    Write-Host "  curl -X POST http://localhost:3456/api/inject/pid -H 'Content-Type: application/json' -d '{\"pid\": YOUR_PID}'"
    exit 1
}
