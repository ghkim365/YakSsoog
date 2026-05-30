@echo off
title Stopping YakSsoog Server...

echo Stopping YakSsoog Python Server (Port 8001)...
powershell -Command "Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo.
echo [DONE] YakSsoog server on port 8001 has been stopped.
timeout /t 2 > nul
exit /b
