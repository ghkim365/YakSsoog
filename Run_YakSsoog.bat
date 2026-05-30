@echo off
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo Cleaning up previous YakSsoog instances...
call Stop_YakSsoog.bat

echo Starting YakSsoog Design Server (Port 8001)...
start "" py run.py

echo Waiting for server to initialize...
timeout /t 2 > nul

echo Opening YakSsoog in default browser...
start http://127.0.0.1:8001/index.html

exit
