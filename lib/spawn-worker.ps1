param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$PhaseNumber,

    [Parameter(Mandatory=$true)]
    [string]$PhaseCommand
)

$claudePath = "$env:APPDATA\npm\claude.cmd"
$title = "Worker-Phase-$PhaseNumber"

Write-Host "Spawning worker for phase $PhaseNumber"

# Use conhost for consistency with orchestrator - capture the process
$proc = Start-Process conhost.exe -ArgumentList "cmd.exe /k title $title && cd /d `"$ProjectPath`" && `"$claudePath`" `"$PhaseCommand`" --dangerously-skip-permissions" -PassThru

# Output the conhost PID - this is what we'll use to check if worker is running
Write-Host "Worker conhost PID: $($proc.Id)"

# Also find the PowerShell/cmd inside it after a brief wait
Start-Sleep -Seconds 2

# Get child processes of the conhost
$children = Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id }
foreach ($child in $children) {
    Write-Host "  Child process: $($child.Name) (PID: $($child.ProcessId))"
}

# Output JSON for easy parsing
$result = @{
    conhostPid = $proc.Id
    phase = $PhaseNumber
    command = $PhaseCommand
} | ConvertTo-Json -Compress

Write-Host "WORKER_INFO:$result"
