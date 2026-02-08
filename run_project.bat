@echo off
title Inventory Management System Launcher
echo ===================================================
echo   Sunshine Inventory Management System - Launcher
echo ===================================================
echo.

echo [1/3] Starting Backend Server...
start "Inventory Backend" cmd /k "cd server && node server.js"

echo [2/3] Starting Frontend Client...
start "Inventory Frontend" cmd /k "cd client_v2 && npm run dev"

echo [3/3] Opening Application in Browser...
timeout /t 4 >nul
start http://localhost:5173

echo.
echo ===================================================
echo   System Running!
echo   - Backend: http://localhost:3000
echo   - Frontend: http://localhost:5173
echo.
echo   Do not close the other two command windows.
echo ===================================================
pause
