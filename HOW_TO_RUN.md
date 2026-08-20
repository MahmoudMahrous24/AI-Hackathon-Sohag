# 🩺 دليل التشغيل الشامل لمشروع DermaAssist AI

مشروع **DermaAssist AI** هو منظومة سريرية متكاملة لطب الجلدية مدعومة بالذكاء الاصطناعي ومستندة إلى الدليل الإرشادي لمنظمة الصحة العالمية (WHO)، مع بوابة متكاملة للأطباء والمرضى.

---

## 📁 هيكل المشروع (Project Structure)

```text
Derma Assist Project/
│
├── START_PROJECT.bat          <-- ملف تشغيل الكل بضغطة زر واحدة (ويندوز)
├── run_backend.bat            <-- تشغيل الباك إند فقط
├── run_frontend.bat           <-- تشغيل الفرونت إند فقط
├── HOW_TO_RUN.md              <-- هذا الدليل
│
├── DermaAssist AI/            <-- الباك إند (FastAPI + ChromaDB + AI Models)
│   ├── api.py
│   ├── generate_answer.py
│   ├── voice_service.py
│   ├── requirements.txt
│   ├── .env                   (محتوي على مفتاح Gemini جاهز)
│   ├── derma_app.db           (قاعدة بيانات SQLite)
│   └── rag_build/
│       └── chroma_db/         (قاعدة المتجهات المفهرسة لكتاب WHO)
│
└── Derma Assist Project/      <-- الفرونت إند (React + TypeScript + Vite + Tailwind)
    ├── package.json
    ├── vite.config.ts
    └── src/
```

---

## ⚡ الطريقة الأولى: التشغيل التلقائي بضغطة واحدة (الأسهل)

فقط اضغط دبل كليك على الملف:
👉 `START_PROJECT.bat`

سيقوم تلقائياً بـ:
1. تثبيت متطلبات بايثون وتشغيل الـ Backend على `http://localhost:8000`.
2. تثبيت حزم npm وتشغيل الـ Frontend على `http://localhost:5173`.
3. افتح المتصفح على: `http://localhost:5173`.

---

## 🛠️ الطريقة الثانية: التشغيل اليدوي خطوة بخطوة (Terminal)

### 1. تشغيل الباك إند (Backend - FastAPI):
افتح نافذة Terminal / PowerShell في مجلد المشروع ونفذ:

```powershell
# 1. الدخول لمجلد الباك إند
cd "DermaAssist AI"

# 2. تثبيت المكتبات (مرة واحدة فقط)
pip install -r requirements.txt

# 3. تشغيل الخادم
python -m uvicorn api:app --reload --port 8000
```
ستظهر رسالة: `Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)`

---

### 2. تشغيل الفرونت إند (Frontend - Vite React):
افتح نافذة Terminal ثانية ونفذ:

```powershell
# 1. الدخول لمجلد الفرونت إند
cd "Derma Assist Project"

# 2. تثبيت حزم Node (مرة واحدة فقط)
npm install

# 3. تشغيل خادم الواجهة
npm run dev
```
ستظهر رسالة: `Local: http://localhost:5173/`

---

## 📌 نصائح مهمة عند الضغط والإرسال (Zipping & Uploading)

1. **ما الذي يجب ضغطه؟**
   - اضغط مجلد المشروع الرئيسي بالكامل `Derma Assist Project` (الذي يحتوي على مجلدي `DermaAssist AI` و `Derma Assist Project`).
   
2. **هل أرفع مجلد `node_modules`؟**
   - **الخيار الأفضل (حجم صغير وسريع):** يمكنك حذف مجلد `node_modules` قبل الضغط ليصبح حجم الملف المضغوط صغيراً جداً وخفيفاً في الرفع، وعندما يفك المستلم الضغط ويشغل `START_PROJECT.bat` أو `npm install` سيتم تنزيل الحزم تلقائياً خلال ثوانٍ.
   - **أو ضغط المجلد كما هو:** سيعمل مباشرة دون الحاجة لأي تنزيل.

3. **مفتاح الذكاء الاصطناعي (Gemini API Key):**
   - المفتاح مدمج وجاهز تلقائياً داخل ملف `.env` في مجلد `DermaAssist AI`. لا يحتاج المستلم لضبط أي إعدادات يدوية.

4. **المتطلبات الأساسية على جهاز المستلم:**
   - **Python 3.10 أو 3.11 أو 3.12** (مع تفعيل خيار `Add Python to PATH` أثناء التثبيت).
   - **Node.js 18+ أو 20+** (متاح مجاناً من nodejs.org).
