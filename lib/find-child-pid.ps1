# Find child process of a given parent PID
param([int]$ParentPID)

Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $ParentPID } |
    Select-Object ProcessId, Name | Format-Table -AutoSize
