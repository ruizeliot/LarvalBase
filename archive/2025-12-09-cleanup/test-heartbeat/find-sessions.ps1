# Find all node and claude processes with command line info
Write-Host "=== NODE PROCESSES ==="
Get-WmiObject Win32_Process -Filter "name='node.exe'" | ForEach-Object {
    Write-Host "PID: $($_.ProcessId)"
    Write-Host "CMD: $($_.CommandLine)"
    Write-Host "---"
}

Write-Host ""
Write-Host "=== CLAUDE PROCESSES ==="
Get-WmiObject Win32_Process -Filter "name='claude.exe'" | ForEach-Object {
    Write-Host "PID: $($_.ProcessId)"
    Write-Host "CMD: $($_.CommandLine)"
    Write-Host "---"
}

Write-Host ""
Write-Host "=== CMD PROCESSES ==="
Get-WmiObject Win32_Process -Filter "name='cmd.exe'" | ForEach-Object {
    Write-Host "PID: $($_.ProcessId), ParentPID: $($_.ParentProcessId)"
    Write-Host "CMD: $($_.CommandLine)"
    Write-Host "---"
}
