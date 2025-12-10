Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
Add-Type -AssemblyName System.Windows.Forms
try {
    $hwnd = [IntPtr]12345
    if ($hwnd -ne [IntPtr]::Zero) {
        $activated = [Win32]::SetForegroundWindow($hwnd)
        if ($activated) {
            Start-Sleep -Milliseconds 300
            [System.Windows.Forms.SendKeys]::SendWait('HEARTBEAT')
            [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
        }
    }
} catch {}