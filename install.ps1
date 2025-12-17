# Pipeline-Office Install Script
# Installs slash commands to ~/.claude/commands/

param(
    [switch]$Force,     # Overwrite existing files
    [switch]$Copy       # Copy instead of symlink (no admin required)
)

$RepoPath = $PSScriptRoot
$CommandsSource = Join-Path $RepoPath "commands"
$CommandsTarget = Join-Path $env:USERPROFILE ".claude\commands"

Write-Host ""
Write-Host "Pipeline-Office Installer" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source: $CommandsSource"
Write-Host "Target: $CommandsTarget"
Write-Host ""

# Ensure target directory exists
if (-not (Test-Path $CommandsTarget)) {
    New-Item -ItemType Directory -Path $CommandsTarget -Force | Out-Null
    Write-Host "Created: $CommandsTarget" -ForegroundColor Green
}

# Get all command files
$commands = Get-ChildItem -Path $CommandsSource -Filter "*.md"
$useSymlinks = -not $Copy

if ($useSymlinks) {
    Write-Host "Mode: Symlinks (changes sync automatically)" -ForegroundColor Cyan
    Write-Host "  Note: Requires admin or Developer Mode enabled" -ForegroundColor Gray
} else {
    Write-Host "Mode: Copy (run again after updates)" -ForegroundColor Yellow
}
Write-Host ""

$failed = @()

foreach ($cmd in $commands) {
    $targetPath = Join-Path $CommandsTarget $cmd.Name
    $sourcePath = $cmd.FullName
    
    if (Test-Path $targetPath) {
        $item = Get-Item $targetPath
        if ($item.LinkType -eq "SymbolicLink") {
            if (-not $Force) {
                Write-Host "  Skip (linked): $($cmd.Name)" -ForegroundColor Gray
                continue
            }
        }
        if ($Force) {
            Remove-Item $targetPath -Force
        } else {
            Write-Host "  Skip (exists): $($cmd.Name)" -ForegroundColor Yellow
            continue
        }
    }
    
    if ($useSymlinks) {
        try {
            New-Item -ItemType SymbolicLink -Path $targetPath -Target $sourcePath -Force -ErrorAction Stop | Out-Null
            Write-Host "  Linked: $($cmd.Name)" -ForegroundColor Green
        } catch {
            $failed += $cmd.Name
            # Fallback to copy
            Copy-Item $sourcePath $targetPath -Force
            Write-Host "  Copied: $($cmd.Name) (symlink failed)" -ForegroundColor Yellow
        }
    } else {
        Copy-Item $sourcePath $targetPath -Force
        Write-Host "  Copied: $($cmd.Name)" -ForegroundColor Green
    }
}

Write-Host ""
if ($failed.Count -gt 0) {
    Write-Host "Note: Symlinks failed for $($failed.Count) files (copied instead)" -ForegroundColor Yellow
    Write-Host "  To enable symlinks: Settings > Developer Mode > ON" -ForegroundColor Gray
    Write-Host "  Or run as Administrator" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done! Pipeline commands installed." -ForegroundColor Green
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  1. cd to your project folder"
Write-Host "  2. Run: claude"
Write-Host "  3. Type: /orchestrator-desktop-v9.0"
Write-Host ""
