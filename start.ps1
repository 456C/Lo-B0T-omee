# Simple PowerShell launcher for Lo Bot Tomee
# Double-click this or run with: powershell -ExecutionPolicy Bypass -File start.ps1

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  Lo Bot Tomee - Discord Embed Fixer" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Folder: $PWD"
Write-Host ""

Write-Host "Press Enter to start the bot (or Ctrl+C to cancel)..."
Read-Host

Write-Host ""
Write-Host "Starting bot..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop."
Write-Host ""

try {
    & node index.js
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Bot has exited. Press Enter to close..." -ForegroundColor Yellow
Read-Host
