# Get the PID of the PowerShell process running in conhost
# This finds the parent PowerShell that hosts Claude

$currentPid = $PID

# Walk up the process tree to find the PowerShell running in conhost
$proc = Get-Process -Id $currentPid -ErrorAction SilentlyContinue

while ($proc) {
    # Check if this process is PowerShell
    if ($proc.ProcessName -eq "powershell" -or $proc.ProcessName -eq "pwsh") {
        # Check if its parent is conhost
        $parent = Get-WmiObject Win32_Process -Filter "ProcessId=$($proc.Id)" | Select-Object -ExpandProperty ParentProcessId
        $parentProc = Get-Process -Id $parent -ErrorAction SilentlyContinue

        if ($parentProc -and $parentProc.ProcessName -eq "conhost") {
            Write-Output $proc.Id
            exit 0
        }
    }

    # Move up to parent
    $parentId = (Get-WmiObject Win32_Process -Filter "ProcessId=$($proc.Id)").ParentProcessId
    if (-not $parentId -or $parentId -eq 0) { break }
    $proc = Get-Process -Id $parentId -ErrorAction SilentlyContinue
}

# Fallback: find any PowerShell with conhost parent
$allPowerShell = Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue
foreach ($ps in $allPowerShell) {
    $parent = Get-WmiObject Win32_Process -Filter "ProcessId=$($ps.Id)" | Select-Object -ExpandProperty ParentProcessId
    $parentProc = Get-Process -Id $parent -ErrorAction SilentlyContinue
    if ($parentProc -and $parentProc.ProcessName -eq "conhost") {
        Write-Output $ps.Id
        exit 0
    }
}

Write-Error "Could not find PowerShell running in conhost"
exit 1
