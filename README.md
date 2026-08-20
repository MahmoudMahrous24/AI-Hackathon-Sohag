# 🩺 DermaAssist AI — Intelligent Clinical Decision Support System

> **Bilingual (Arabic / English) AI-powered Clinical Decision Support & Tele-Dermatology Platform grounded in the official World Health Organization (WHO) Dermatology Guidelines.**

---

## 🌟 Key Features

- 🧠 **Evidence-Based Clinical Guidance**: Integrates the *WHO Skin NTD & Clinical Dermatology Handbook* with vector retrieval (ChromaDB + Nomic Embeddings) and Gemini 3.6 Flash.
- 📖 **Interactive Real WHO Handbook Reader**: Seamless interactive book modal browsing all 137 official WHO handbook pages with exact citation highlights.
- 🎙️ **Voice & Audio Query Support**: Record voice inquiries in Arabic or English with automatic speech-to-text transcription and clinical analysis.
- 📸 **Multimodal Lesion Analysis**: Upload skin lesion images or dynamic clinical videos for structured visual assessment and WHO triage.
- 🩺 **Doctor-Patient Portal**:
  - **Patient Portal**: Ask questions, request consultations with certified dermatologists, track prescription history.
  - **Doctor CDS Portal**: Review patient cases, view clinical media, and write/issue official approved prescriptions.
- 🔒 **Strict Role Enforcement & Profile Management**: Isolated doctor/patient roles, profile editing, optional profile photo upload, and account deletion.
- 💾 **Persistent Chat & Consultation Storage**: SQLite-backed per-account session and message isolation.

---

## 🏗️ Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                    DermaAssist Platform                     │
├───────────────────────────────┬─────────────────────────────┤
│      Frontend (Port 5173)     │     Backend (Port 8000)     │
├───────────────────────────────┼─────────────────────────────┤
│ • React 19 + TypeScript       │ • FastAPI (Python 3.11)     │
│ • Vite 8 + Tailwind CSS       │ • ChromaDB (Vector RAG)     │
│ • Lucide Icons + Responsive UI│ • SentenceTransformers      │
│ • Full Arabic / English i18n  │ • Gemini 3.6 Flash API      │
│ • WHO Real Book Reader Cache  │ • SQLite (derma_app.db)     │
└───────────────────────────────┴─────────────────────────────┘
```

---

## 🚀 Quick Start & Installation

### Option 1: One-Click Startup (Windows)
Double-click:
👉 `START_PROJECT.bat`

This automatically installs dependencies and starts both the FastAPI backend (`http://localhost:8000`) and the Vite frontend (`http://localhost:5173`).

---

### Option 2: Manual Terminal Startup

#### 1. Start Backend (FastAPI):
```bash
cd "DermaAssist AI"
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000
```

#### 2. Start Frontend (Vite React):
```bash
cd "Derma Assist Project"
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📄 License
This project is developed for hackathon and clinical decision support demonstration.
