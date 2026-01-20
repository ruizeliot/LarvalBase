# Register Claude Code PID with Live Canvas for message injection
# This script finds the Claude Code process and registers its PID

param(
    [string]$PipelineDir = "."
)

# Find Claude Code process (node.exe running claude)
$proc = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*claude*' } |
    Select-Object -First 1

if ($proc) {
    $claudePid = $proc.ProcessId

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
    Write-Host "ERROR: Could not find Claude Code process (node.exe with 'claude' in command line)"
    Write-Host "Available node processes:"
    Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | ForEach-Object {
        Write-Host "  PID: $($_.ProcessId) - $($_.CommandLine.Substring(0, [Math]::Min(100, $_.CommandLine.Length)))..."
    }
    exit 1
}
