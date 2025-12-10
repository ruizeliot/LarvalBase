# Get the HWND of the current foreground window
# Must be run while the target terminal is focused
# GetConsoleWindow returns 0 in Windows Terminal (ConPTY issue)

Add-Type -Name Win32 -Namespace User32 -MemberDefinition @'
[DllImport("user32.dll")]
public static extern IntPtr GetForegroundWindow();
'@

$hwnd = [User32.Win32]::GetForegroundWindow()
Write-Output $hwnd
