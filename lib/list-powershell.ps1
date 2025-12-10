# List all PowerShell processes and their parent info
Get-Process powershell, pwsh -ErrorAction SilentlyContinue | ForEach-Object {
    $parentId = (Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)").ParentProcessId
    $parentProc = Get-Process -Id $parentId -ErrorAction SilentlyContinue
    $parentName = if ($parentProc) { $parentProc.ProcessName } else { "unknown" }

    Write-Output "PID: $($_.Id) | Parent: $parentId ($parentName) | Title: $($_.MainWindowTitle)"
}
