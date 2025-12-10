# List all PowerShell and cmd processes with their parent info
Get-WmiObject Win32_Process | Where-Object {
    $_.Name -eq 'powershell.exe' -or $_.Name -eq 'cmd.exe' -or $_.Name -eq 'node.exe'
} | ForEach-Object {
    $parent = Get-Process -Id $_.ParentProcessId -ErrorAction SilentlyContinue
    [PSCustomObject]@{
        PID = $_.ProcessId
        Name = $_.Name
        ParentPID = $_.ParentProcessId
        ParentName = if($parent) { $parent.ProcessName } else { "N/A" }
    }
} | Format-Table -AutoSize
