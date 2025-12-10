Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Windows.Forms

try {
    [Microsoft.VisualBasic.Interaction]::AppActivate('E2E-Orchestrator')
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait('TEST MESSAGE FROM CLAUDE')
    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
    Write-Host 'SUCCESS'
} catch {
    Write-Host ('FAILED: ' + $_)
}
