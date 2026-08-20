@echo off
chcp 65001 > nul
echo ========================================================
echo        💻 تشغيل الفرونت إند - DermaAssist Frontend 💻
echo ========================================================
echo.
cd /d "%~dp0Derma Assist Project"
echo تثبيت حزم npm (إذا لم تكن مثبتة)...
npm install
echo.
echo تشغيل خادم التطوير على المنفذ 5173...
npm run dev
pause
