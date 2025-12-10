param(
    [string]$ProjectPath = ""
)

# Find dashboard process for this project
Write-Host "=== DASHBOARD ===" -ForegroundColor Cyan
$dashboard = Get-WmiObject Win32_Process -Filter "name='node.exe'" | Where-Object {
    $_.CommandLine -like "*dashboard.cjs*" -and $_.CommandLine -like "*$ProjectPath*"
}
if ($dashboard) {
    Write-Host "Found: PID $($dashboard.ProcessId)"
    Write-Host "CMD: $($dashboard.CommandLine)"
} else {
    Write-Host "Not found"
}

# Find worker (Claude) process - look for claude-code cli with --dangerously-skip-permissions
Write-Host ""
Write-Host "=== WORKER (Claude) ===" -ForegroundColor Yellow
$workers = Get-WmiObject Win32_Process -Filter "name='node.exe'" | Where-Object {
    $_.CommandLine -like "*claude-code*" -and $_.CommandLine -like "*--dangerously-skip-permissions*"
}
foreach ($worker in $workers) {
    Write-Host "Found: PID $($worker.ProcessId)"
    Write-Host "CMD: $($worker.CommandLine)"

    # Find parent cmd.exe to get window info
    $parentCmd = Get-WmiObject Win32_Process -Filter "ProcessId=$($worker.ParentProcessId)"
    if ($parentCmd) {
        Write-Host "Parent: PID $($parentCmd.ProcessId) - $($parentCmd.Name)"
    }
}
if (-not $workers) {
    Write-Host "Not found"
}

# Also check for any node processes running in this project
Write-Host ""
Write-Host "=== ALL NODE IN PROJECT ===" -ForegroundColor Green
Get-WmiObject Win32_Process -Filter "name='node.exe'" | Where-Object {
    $_.CommandLine -like "*$ProjectPath*"
} | ForEach-Object {
    Write-Host "PID: $($_.ProcessId)"
    Write-Host "CMD: $($_.CommandLine)"
    Write-Host "---"
}
