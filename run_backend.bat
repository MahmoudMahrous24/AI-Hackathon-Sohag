@echo off
chcp 65001 > nul
echo ========================================================
echo        🩺 تشغيل الباك إند - DermaAssist AI Backend 🩺
echo ========================================================
echo.
cd /d "%~dp0DermaAssist AI"
echo تثبيت المتطلبات (إذا لم تكن مثبتة)...
pip install -r requirements.txt
echo.
echo تشغيل الخادم على المنفذ 8000...
python -m uvicorn api:app --reload --host 127.0.0.1 --port 8000
pause
