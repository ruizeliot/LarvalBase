# Find the topmost shell process in the process tree
# This gives us the shell PID that can receive console input via AttachConsole
# NOTE: bash.exe and sh.exe do NOT work with AttachConsole in Windows Terminal (Error 87)
# Only cmd.exe, powershell.exe, and pwsh.exe support AttachConsole

$p = $PID
$shellPid = $null
$nodePid = $null
$shells = @("powershell.exe", "pwsh.exe", "cmd.exe")  # bash.exe excluded - doesn't support AttachConsole

while ($true) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $p" -ErrorAction SilentlyContinue
    if (-not $proc) { break }

    if ($proc.Name -in $shells) {
        $shellPid = $p
    }

    # Also track node.exe as fallback (Claude Code) - it supports AttachConsole
    if ($proc.Name -eq "node.exe") {
        $nodePid = $p
    }

    $parent = $proc.ParentProcessId
    if (-not $parent -or $parent -eq $p -or $parent -eq 0) { break }
    $p = $parent
}

# Return shell PID if found, otherwise node.exe PID as fallback
if ($shellPid) {
    Write-Output $shellPid
} elseif ($nodePid) {
    Write-Output $nodePid
} else {
    Write-Output $PID
}
