# Read text from a Windows Terminal window using UI Automation
# Usage: .\read-terminal.ps1 -WindowTitle "Worker*" [-Lines 50]
#        .\read-terminal.ps1 -HWND 264792 [-Lines 50]
#
# This script uses UI Automation to find "Document" control types within
# Windows Terminal, which expose the terminal text via TextPattern.
# Based on pywinauto issue #492 findings.

param(
    [string]$WindowTitle = "",
    [string]$HWND = "",  # Window handle (decimal)
    [int]$Lines = 50,
    [switch]$Raw  # Output raw text without headers
)

# Default to wildcard if neither specified
if (-not $WindowTitle -and -not $HWND) {
    $WindowTitle = "*"
}

# Load UI Automation assemblies
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Get-TerminalText {
    param(
        [System.Windows.Automation.AutomationElement]$Window,
        [int]$LineCount
    )

    $textPatternId = [System.Windows.Automation.TextPattern]::Pattern

    # Strategy 1: Look for Document control type (Windows Terminal uses this)
    $documentCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Document
    )

    $documents = $Window.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        $documentCondition
    )

    foreach ($doc in $documents) {
        try {
            $textPattern = $doc.GetCurrentPattern($textPatternId)
            if ($textPattern) {
                $documentRange = $textPattern.DocumentRange
                $text = $documentRange.GetText(-1)
                if ($text -and $text.Trim()) {
                    return @{
                        Success = $true
                        Text = $text
                        Source = "Document"
                        ControlName = $doc.Current.Name
                    }
                }
            }
        } catch {
            # Continue to next document
        }
    }

    # Strategy 2: Look for any element with TextPattern (fallback)
    $allCondition = [System.Windows.Automation.Condition]::TrueCondition
    $children = $Window.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        $allCondition
    )

    foreach ($child in $children) {
        try {
            $patterns = $child.GetSupportedPatterns()
            if ($patterns -contains $textPatternId) {
                $textPattern = $child.GetCurrentPattern($textPatternId)
                $documentRange = $textPattern.DocumentRange
                $text = $documentRange.GetText(-1)
                if ($text -and $text.Trim().Length -gt 50) {
                    return @{
                        Success = $true
                        Text = $text
                        Source = $child.Current.ControlType.ProgrammaticName
                        ControlName = $child.Current.Name
                    }
                }
            }
        } catch {
            # Continue searching
        }
    }

    # Strategy 3: Try Edit control type (some terminals use this)
    $editCondition = New-Object System.Windows.Automation.PropertyCondition(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit
    )

    $edits = $Window.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        $editCondition
    )

    foreach ($edit in $edits) {
        try {
            $textPattern = $edit.GetCurrentPattern($textPatternId)
            if ($textPattern) {
                $documentRange = $textPattern.DocumentRange
                $text = $documentRange.GetText(-1)
                if ($text -and $text.Trim().Length -gt 50) {
                    return @{
                        Success = $true
                        Text = $text
                        Source = "Edit"
                        ControlName = $edit.Current.Name
                    }
                }
            }
        } catch {
            # Continue
        }
    }

    return @{ Success = $false }
}

try {
    $rootElement = [System.Windows.Automation.AutomationElement]::RootElement
    $found = $false
    $targetWindow = $null

    # If HWND specified, find window by handle
    if ($HWND) {
        try {
            $hwndInt = [IntPtr]::new([int64]$HWND)
            $targetWindow = [System.Windows.Automation.AutomationElement]::FromHandle($hwndInt)
            if ($targetWindow) {
                $found = $true
                $name = $targetWindow.Current.Name

                if (-not $Raw) {
                    Write-Host "=== Window (HWND $HWND): $name ===" -ForegroundColor Cyan
                }

                $result = Get-TerminalText -Window $targetWindow -LineCount $Lines

                if ($result.Success) {
                    $text = $result.Text
                    $allLines = $text -split "`r?`n"
                    $lastLines = $allLines | Select-Object -Last $Lines

                    if ($Raw) {
                        $lastLines | ForEach-Object { Write-Output $_ }
                    } else {
                        Write-Host "Found text via: $($result.Source)" -ForegroundColor Green
                        if ($result.ControlName) {
                            Write-Host "Control: $($result.ControlName)" -ForegroundColor DarkGray
                        }
                        Write-Host ""
                        Write-Host "=== Last $Lines lines ===" -ForegroundColor Yellow
                        $lastLines | ForEach-Object { Write-Host $_ }
                        Write-Host ""
                    }
                } else {
                    if (-not $Raw) {
                        Write-Host "Could not extract text from this window" -ForegroundColor Red
                    }
                }
            }
        } catch {
            if (-not $Raw) {
                Write-Host "Error finding window by HWND $HWND : $($_.Exception.Message)" -ForegroundColor Red
            }
            exit 1
        }
    }

    # If no HWND or not found, search by title
    if (-not $found -and $WindowTitle) {
        # Find windows matching title pattern
        $windowCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Window
        )

        $windows = $rootElement.FindAll(
            [System.Windows.Automation.TreeScope]::Children,
            $windowCondition
        )

        foreach ($window in $windows) {
            $name = $window.Current.Name
            if ($name -like $WindowTitle) {
                $found = $true

                if (-not $Raw) {
                    Write-Host "=== Window: $name ===" -ForegroundColor Cyan
                }

                $result = Get-TerminalText -Window $window -LineCount $Lines

                if ($result.Success) {
                    $text = $result.Text
                    $allLines = $text -split "`r?`n"
                    $lastLines = $allLines | Select-Object -Last $Lines

                    if ($Raw) {
                        $lastLines | ForEach-Object { Write-Output $_ }
                    } else {
                        Write-Host "Found text via: $($result.Source)" -ForegroundColor Green
                        if ($result.ControlName) {
                            Write-Host "Control: $($result.ControlName)" -ForegroundColor DarkGray
                        }
                        Write-Host ""
                        Write-Host "=== Last $Lines lines ===" -ForegroundColor Yellow
                        $lastLines | ForEach-Object { Write-Host $_ }
                        Write-Host ""
                    }
                } else {
                    if (-not $Raw) {
                        Write-Host "Could not extract text from this window" -ForegroundColor Red
                        Write-Host "Windows Terminal may need to be the active tab" -ForegroundColor Yellow
                    }
                }
            }
        }
    }

    if (-not $found) {
        if (-not $Raw) {
            if ($HWND) {
                Write-Host "No window found with HWND: $HWND" -ForegroundColor Red
            } else {
                Write-Host "No window found matching: $WindowTitle" -ForegroundColor Red
                Write-Host ""
                Write-Host "Available windows:" -ForegroundColor Yellow
                foreach ($window in $windows) {
                    $name = $window.Current.Name
                    if ($name) {
                        Write-Host "  - $name"
                    }
                }
            }
        }
        exit 1
    }

} catch {
    if (-not $Raw) {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}
