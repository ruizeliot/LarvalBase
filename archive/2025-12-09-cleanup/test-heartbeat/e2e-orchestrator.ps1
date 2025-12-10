# E2E Test: Simulated Orchestrator
# This script simulates what an orchestrator Claude session would do:
# 1. Get its own terminal PID
# 2. Display status
# 3. Wait for heartbeats

Write-Host "=== E2E TEST: Simulated Orchestrator ===" -ForegroundColor Cyan
Write-Host ""

# Get our Windows Terminal PID
$wtProcesses = Get-Process WindowsTerminal -ErrorAction SilentlyContinue
Write-Host "Found Windows Terminal processes:"
$wtProcesses | ForEach-Object { Write-Host "  PID: $($_.Id)" }
Write-Host ""

# Since we're the newest window, we need to find which one is us
# We'll output our PID to a file so the test can read it
$myPid = $wtProcesses | Sort-Object StartTime -Descending | Select-Object -First 1 -ExpandProperty Id
Write-Host "My Windows Terminal PID: $myPid" -ForegroundColor Green
Write-Host ""

# Save PID to file for the test harness to read
$myPid | Out-File -FilePath "C:\Users\ahunt\Documents\IMT Claude\Pipeline-Office\test-heartbeat\.orchestrator-pid" -NoNewline

Write-Host "Waiting for heartbeats from dashboard..." -ForegroundColor Yellow
Write-Host "Any heartbeat messages will appear as typed input below:"
Write-Host "-------------------------------------------"
Write-Host ""

# Keep the window open
cmd /k "echo Ready to receive heartbeats..."
