@echo off
chcp 65001 > nul
echo ========================================================
echo        🚀 تشغيل مشروع DermaAssist AI المتكامل 🚀
echo ========================================================
echo.

:: Auto-create .env from .env.example if missing
if not exist "%~dp0DermaAssist AI\.env" (
    if exist "%~dp0DermaAssist AI\.env.example" (
        copy "%~dp0DermaAssist AI\.env.example" "%~dp0DermaAssist AI\.env" > nul
    )
)

echo [1/2] جاري تشغيل خادم الذكاء الاصطناعي (FastAPI Backend)...
start "DermaAssist Backend (Port 8000)" cmd /k "cd /d "%~dp0DermaAssist AI" && pip install -r requirements.txt && python -m uvicorn api:app --reload --port 8000"

echo [2/2] جاري تشغيل واجهة المستخدم (Vite React Frontend)...
start "DermaAssist Frontend (Port 5173)" cmd /k "cd /d "%~dp0Derma Assist Project" && npm install && npm run dev"

echo.
echo ========================================================
echo  تم إطلاق المنظومة بنجاح!
echo  افتح المتصفح بعد انتهاء التحميل على الرابط:
echo  👉 http://localhost:5173
echo ========================================================
echo.
pause
