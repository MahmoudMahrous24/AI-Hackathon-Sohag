# Launch both Backend (FastAPI) and Frontend (Vite React)
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Starting DermaAssist AI Full Stack Project      " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "DermaAssist AI"
$frontendDir = Join-Path $PSScriptRoot "Derma Assist Project"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; python api.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; npm run dev"

Write-Host "`nBackend starting at: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend starting at: http://localhost:5173" -ForegroundColor Green
Write-Host "`nOpen http://localhost:5173 in your browser." -ForegroundColor Yellow
