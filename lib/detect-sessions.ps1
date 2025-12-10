param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [string]$PhaseNumber = "",

    [int]$WorkerConhostPID = 0
)

$result = @{
    dashboard = $null
    worker = $null
    workerRunning = $false
}

# Find dashboard - node process running dashboard.cjs for this project
$dashboards = Get-WmiObject Win32_Process -Filter "name='node.exe'" | Where-Object {
    $_.CommandLine -like "*dashboard.cjs*" -and $_.CommandLine -like "*$ProjectPath*"
}
if ($dashboards) {
    $d = $dashboards | Select-Object -First 1
    $result.dashboard = @{
        pid = $d.ProcessId
        running = $true
    }
}

# Check worker by conhost PID if provided
if ($WorkerConhostPID -gt 0) {
    $proc = Get-Process -Id $WorkerConhostPID -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "conhost") {
        $result.worker = @{
            conhostPid = $WorkerConhostPID
            phase = $PhaseNumber
            running = $true
        }
        $result.workerRunning = $true
    } else {
        $result.worker = @{
            conhostPid = $WorkerConhostPID
            phase = $PhaseNumber
            running = $false
        }
        $result.workerRunning = $false
    }
} else {
    # Fallback: find any Claude worker process by command line
    $claudeProcesses = Get-WmiObject Win32_Process -Filter "name='node.exe'" | Where-Object {
        $_.CommandLine -like "*claude-code*" -and $_.CommandLine -like "*--dangerously-skip-permissions*"
    }
    if ($claudeProcesses) {
        $c = $claudeProcesses | Select-Object -First 1
        $result.worker = @{
            pid = $c.ProcessId
            running = $true
        }
        $result.workerRunning = $true
    }
}

# Output as JSON
$result | ConvertTo-Json -Depth 3
