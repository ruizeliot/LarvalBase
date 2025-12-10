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

# Spawn conhost with cmd running claude
$proc = Start-Process conhost.exe -ArgumentList "cmd.exe /k title $title && cd /d `"$ProjectPath`" && `"$claudePath`" `"$PhaseCommand`" --dangerously-skip-permissions" -PassThru

Write-Host "Worker conhost PID: $($proc.Id)"

# Wait for child process to start
Start-Sleep -Seconds 3

# Find the cmd.exe child process - THIS is what we need for reading console buffer
$children = Get-WmiObject Win32_Process | Where-Object { $_.ParentProcessId -eq $proc.Id }
$childPid = $null
foreach ($child in $children) {
    Write-Host "  Child process: $($child.Name) (PID: $($child.ProcessId))"
    if ($child.Name -eq "cmd.exe") {
        $childPid = $child.ProcessId
    }
}

if (-not $childPid) {
    Write-Host "WARNING: Could not find child cmd.exe process"
    $childPid = $proc.Id
}

# Output JSON for easy parsing - workerPid is the CMD process (for reading console buffer)
$result = @{
    conhostPid = $proc.Id
    workerPid = $childPid
    phase = $PhaseNumber
    command = $PhaseCommand
} | ConvertTo-Json -Compress

Write-Host "WORKER_INFO:$result"
