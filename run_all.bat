@echo off
echo ===================================================
echo   Starting DermaAssist AI Full Stack Project
echo ===================================================
echo.

start "DermaAssist AI - Backend (Port 8000)" cmd /k "cd /d \"%~dp0DermaAssist AI\" && python api.py"
start "DermaAssist AI - Frontend (Port 5173)" cmd /k "cd /d \"%~dp0Derma Assist Project\" && npm run dev"

echo Backend started on http://localhost:8000
echo Frontend started on http://localhost:5173
echo.
echo You can open http://localhost:5173 in your browser!
