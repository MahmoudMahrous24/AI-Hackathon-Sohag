@echo off
chcp 65001 > nul
echo ========================================================
echo        🚀 تشغيل مشروع DermaAssist AI المتكامل 🚀
echo ========================================================
echo.

echo [1/2] جاري تشغيل خادم الذكاء الاصطناعي (FastAPI Backend)...
start "DermaAssist Backend (Port 8000)" cmd /k "cd /d "%~dp0DermaAssist AI" && pip install -r requirements.txt && python -m uvicorn api:app --reload --port 8000"

echo [2/2] جاري تشغيل واجهة المستخدم (Vite React Frontend)...
start "DermaAssist Frontend (Port 5173)" cmd /k "cd /d "%~dp0Derma Assist Project" && npm install && npm run dev"

echo.
echo ========================================================
echo  تم إطلاق الخادمين بنجاح!
echo  افتح المتصفح بعد اكتمال التحميل على:
echo  👉 http://localhost:5173
echo ========================================================
echo.
pause
