@echo off
cd /d "%~dp0"
title Lo Bot Tomee

:: This trick forces the window to stay open even if the script crashes or ends
if not "%~1"=="keepopen" (
    start "Lo Bot Tomee" cmd /k "%~f0" keepopen
    exit /b
)

echo ===============================================
echo   Lo Bot Tomee - Discord Embed Fixer
echo ===============================================
echo.
echo Folder: %CD%
echo.

echo This window will stay open. Press any key to continue...
pause >nul

echo.
echo [1/3] Looking for Node.js...

set "NODE_CMD="

where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "NODE_CMD=node"
    echo Found 'node' in PATH.
) else (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE_CMD=C:\Program Files\nodejs\node.exe"
        echo Using full path.
    )
)

if not defined NODE_CMD (
    echo [ERROR] Node.js not found!
    echo.
    echo Open a new terminal and test: node --version
    echo.
    pause
    exit /b
)

echo.
echo [2/3] Testing Node...
"%NODE_CMD%" --version
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node test failed.
    pause
    exit /b
)

echo.
echo [3/3] Checking config...

if not exist "Config" if not exist "Config.txt" if not exist ".env" (
    echo [ERROR] No config file!
    echo Create/edit "Config" or "Config.txt" with your token.
    pause
    exit /b
)

echo Config OK.

echo.
echo ===============================================
echo   Starting the bot...
echo ===============================================
echo.
echo Press Ctrl+C to stop.
echo.

"%NODE_CMD%" index.js

echo.
echo Bot has exited.
pause
exit /b