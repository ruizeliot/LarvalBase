param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,

    [Parameter(Mandatory=$true)]
    [string]$OrchestratorPID
)

Write-Host "Spawning dashboard for: $ProjectPath"
Write-Host "Orchestrator PID: $OrchestratorPID (will use WriteConsoleInput for heartbeat)"

# Use conhost for consistency (WriteConsoleInput requires traditional console)
Start-Process conhost.exe -ArgumentList "cmd.exe /k title Pipeline-Dashboard && cd /d `"$ProjectPath`" && node .pipeline/dashboard.cjs `"$ProjectPath`" $OrchestratorPID"

Write-Host "Dashboard spawned"
