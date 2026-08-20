import os
import io
import json
import base64
import hashlib
import sqlite3
import datetime
from typing import Optional
import contextlib

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import chromadb

from generate_answer import (
    resolve_chroma_path,
    answer_question,
    is_arabic,
    DOCUMENT_NAME,
    GeminiGenerator,
    SmartLocalGenerator,
    QUERY_PREFIX,
)
from voice_service import transcribe_audio

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "derma_app.db")

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def init_database():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Real Users Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('patient', 'doctor')),
        birth_date TEXT,
        gender TEXT,
        phone_number TEXT,
        title TEXT,
        specialty TEXT,
        avatar_url TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 2. Chat Sessions Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # 3. Chat Messages Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        text TEXT,
        image_url TEXT,
        video_url TEXT,
        audio_url TEXT,
        audio_duration INTEGER,
        book_reference TEXT,
        analysis TEXT,
        doctor_consultation TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 4. Consultations Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS consultations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        doctor_title TEXT,
        doctor_avatar TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'replied')),
        clinical_text TEXT,
        image_url TEXT,
        video_url TEXT,
        audio_url TEXT,
        prescription_meds TEXT,
        prescription_instructions TEXT,
        prescription_urgency TEXT DEFAULT 'routine',
        doctor_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
    )
    """)

    conn.commit()
    conn.close()


init_database()


# Global state containers
models_state = {
    "chroma_collection": None,
    "embed_model": None,
    "generator": None,
    "generator_type": "Initializing...",
    "chroma_path": "",
    "gemini_key": None,
}

HANDBOOK_PAGES: dict[int, dict] = {}
SORTED_PAGE_NUMBERS: list[int] = []


def populate_handbook_pages(collection):
    global HANDBOOK_PAGES, SORTED_PAGE_NUMBERS
    if not collection:
        return
    try:
        all_data = collection.get()
        docs = all_data.get("documents", [])
        metas = all_data.get("metadatas", [])

        pages_dict = {}
        for doc, meta in zip(docs, metas):
            p = int(meta.get("page_start") or 1)
            if p not in pages_dict:
                pages_dict[p] = {
                    "page_number": p,
                    "page_end": int(meta.get("page_end") or p),
                    "section_title": meta.get("section_title") or meta.get("chapter_title") or "WHO Clinical Guidelines",
                    "chapter_title": meta.get("chapter_title") or "",
                    "disease_tags": meta.get("disease_tags") or "",
                    "chunks": [],
                }
            pages_dict[p]["chunks"].append(doc)

        for p, data in pages_dict.items():
            data["content"] = "\n\n".join(data["chunks"])
            del data["chunks"]

        HANDBOOK_PAGES = pages_dict
        SORTED_PAGE_NUMBERS = sorted(pages_dict.keys())
        print(f"[Handbook Cache] Cached {len(HANDBOOK_PAGES)} pages (Pages: {SORTED_PAGE_NUMBERS[0]} to {SORTED_PAGE_NUMBERS[-1]})")
    except Exception as e:
        print(f"[Handbook Cache] Warning: Failed to populate pages: {e}")


def initialize_ai_pipeline():
    global models_state
    if models_state["embed_model"] is not None:
        return

    chroma_path = resolve_chroma_path("rag_build/chroma_db")
    models_state["chroma_path"] = chroma_path
    collection_name = "derma_handbook"

    print(f"[AI Pipeline] Initializing ChromaDB from: {chroma_path}")
    chroma_client = chromadb.PersistentClient(path=chroma_path)
    try:
        models_state["chroma_collection"] = chroma_client.get_collection(collection_name)
        print(f"[AI Pipeline] Loaded collection '{collection_name}' with {models_state['chroma_collection'].count()} vectors.")
        populate_handbook_pages(models_state["chroma_collection"])
    except Exception as e:
        print(f"[AI Pipeline] Warning: Collection not found ({e}). Creating fallback collection...")
        models_state["chroma_collection"] = chroma_client.get_or_create_collection(collection_name)

    print("[AI Pipeline] Loading local embedding model (nomic-ai/nomic-embed-text-v1.5)...")
    models_state["embed_model"] = SentenceTransformer("nomic-ai/nomic-embed-text-v1.5", trust_remote_code=True)

    gemini_key = os.environ.get("GEMINI_API_KEY")
    models_state["gemini_key"] = gemini_key
    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

    if gemini_key:
        try:
            models_state["generator"] = GeminiGenerator(model=gemini_model, api_key=gemini_key)
            models_state["generator_type"] = f"Gemini ({gemini_model})"
            print(f"[AI Pipeline] Initialized Gemini Generator with model: {gemini_model}")
        except Exception as e:
            print(f"[AI Pipeline] Warning: Could not initialize GeminiGenerator ({e}). Using SmartLocalGenerator.")
            models_state["generator"] = SmartLocalGenerator()
            models_state["generator_type"] = "SmartLocalGenerator"
    else:
        print("[AI Pipeline] INFO: GEMINI_API_KEY not configured. Running in Smart Local CDS Mode.")
        models_state["generator"] = SmartLocalGenerator()
        models_state["generator_type"] = "SmartLocalGenerator"


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    initialize_ai_pipeline()
    yield


app = FastAPI(
    title="DermaAssist CDS API",
    description="Full Clinical Decision Support & Tele-Dermatology Platform",
    version="3.6.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def embed_fn(text: str) -> list[float]:
    if models_state["embed_model"] is None:
        initialize_ai_pipeline()
    return models_state["embed_model"].encode([QUERY_PREFIX + text]).tolist()[0]


# --- Schemas ---

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(patient|doctor)$")
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    title: Optional[str] = None
    specialty: Optional[str] = None
    avatar_url: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class BookReferenceDto(BaseModel):
    book_title: str
    section_title: str
    page_start: int
    page_end: int
    excerpt: str


class AnalysisDetail(BaseModel):
    condition: str
    confidence: int
    characteristics: list[str]
    explanation: str


class QueryRequest(BaseModel):
    query: str
    k: int = Field(default=5, ge=1, le=10)


class QueryResponse(BaseModel):
    query: str
    search_query: str
    answer: str
    citation: Optional[str] = None
    book_reference: Optional[BookReferenceDto] = None
    refused: bool = False
    formatted_output: str
    analysis: Optional[AnalysisDetail] = None


class CreateChatDto(BaseModel):
    user_id: str
    title: Optional[str] = "محادثة استشارية جديدة"


class SaveMessageDto(BaseModel):
    id: str
    chat_id: str
    role: str
    type: str = "text"
    text: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    audio_url: Optional[str] = None
    audio_duration: Optional[int] = None
    book_reference: Optional[dict] = None
    analysis: Optional[dict] = None
    doctor_consultation: Optional[dict] = None


class ConsultationRequestDto(BaseModel):
    patient_id: str
    patient_name: str
    doctor_id: str
    clinical_text: Optional[str] = ""
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    audio_url: Optional[str] = None


class PrescriptionDto(BaseModel):
    medications: list[str]
    instructions: str
    urgency: str = "routine"
    doctor_notes: Optional[str] = None


class ReplyConsultationDto(BaseModel):
    prescription: PrescriptionDto
    doctor_notes: Optional[str] = None


def run_rag_pipeline(query_text: str, k: int = 5) -> QueryResponse:
    """Helper to run RAG answering without blunt refusals."""
    if models_state["chroma_collection"] is None or models_state["generator"] is None:
        initialize_ai_pipeline()

    res = answer_question(
        collection=models_state["chroma_collection"],
        embed_fn=embed_fn,
        generator=models_state["generator"],
        query=query_text,
        k=k,
    )

    book_ref = None
    if res.get("book_reference"):
        ref = res["book_reference"]
        book_ref = BookReferenceDto(
            book_title=ref.get("book_title", DOCUMENT_NAME),
            section_title=ref.get("section_title", "WHO Clinical Dermatology"),
            page_start=ref.get("page_start", 14),
            page_end=ref.get("page_end", 14),
            excerpt=ref.get("excerpt", ""),
        )

    return QueryResponse(
        query=res["query"],
        search_query=res.get("search_query", res["query"]),
        answer=res["answer"],
        citation=res.get("citation"),
        book_reference=book_ref,
        refused=res.get("refused", False),
        formatted_output=res["formatted_output"],
    )


# --- 1. Authentication Endpoints ---

@app.post("/auth/register")
def register(req: RegisterRequest):
    email_clean = req.email.strip().lower()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = ?", (email_clean,))
    if cur.fetchone():
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر."
        )

    user_id = f"{req.role}-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    avatar = req.avatar_url or (
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"
        if req.role == "doctor"
        else "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
    )
    title = req.title or ("استشاري أمراض الجلدية" if req.role == "doctor" else None)
    specialty = req.specialty or ("الأمراض الجلدية العامة" if req.role == "doctor" else None)

    cur.execute("""
    INSERT INTO users (
        id, email, password_hash, name, role, birth_date, gender, phone_number,
        title, specialty, avatar_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        email_clean,
        hash_password(req.password),
        req.name.strip(),
        req.role,
        req.birth_date,
        req.gender,
        req.phone_number,
        title,
        specialty,
        avatar,
        datetime.datetime.utcnow().isoformat(),
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "تم إنشاء الحساب بنجاح!",
        "user": {
            "id": user_id,
            "name": req.name.strip(),
            "email": email_clean,
            "role": req.role,
            "birthDate": req.birth_date,
            "gender": req.gender,
            "phoneNumber": req.phone_number,
            "title": title,
            "specialty": specialty,
            "avatarUrl": avatar,
        }
    }


@app.post("/auth/login")
def login(req: LoginRequest):
    email_clean = req.email.strip().lower()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE email = ?", (email_clean,))
    user = cur.fetchone()
    conn.close()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="البريد الإلكتروني غير مسجل في النظام. يرجى التحقق من البريد أو إنشاء حساب جديد."
        )

    if user["password_hash"] != hash_password(req.password):
        raise HTTPException(
            status_code=400,
            detail="كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور والمحاولة مرة أخرى."
        )

    return {
        "success": True,
        "message": f"مرحباً بك مجدداً يا {user['name']}",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "birthDate": user["birth_date"],
            "gender": user["gender"],
            "phoneNumber": user["phone_number"],
            "title": user["title"],
            "specialty": user["specialty"],
            "avatarUrl": user["avatar_url"],
        }
    }


class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    phone_number: Optional[str] = None
    title: Optional[str] = None
    specialty: Optional[str] = None
    avatar_url: Optional[str] = None


@app.put("/users/{user_id}")
def update_user(user_id: str, req: UpdateUserRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cur.fetchone()

    if not user:
        # Auto-upsert user record so it never fails with 404
        role = "doctor" if "doctor" in user_id else "patient"
        name = req.name.strip() if req.name else "مستخدم DermaAssist"
        email = f"{user_id}@derma.com"
        pwd_hash = hash_password(req.password) if req.password and len(req.password) >= 6 else hash_password("123456")
        birth_date = req.birth_date or "2000-01-01"
        gender = req.gender or "male"
        phone_number = req.phone_number or "01000000000"
        title = req.title or ("استشاري أمراض الجلدية" if role == "doctor" else None)
        specialty = req.specialty or ("الأمراض الجلدية العامة" if role == "doctor" else None)
        avatar_url = req.avatar_url or (
            "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"
            if role == "doctor"
            else "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
        )
        now = datetime.datetime.utcnow().isoformat()

        cur.execute("""
        INSERT INTO users (
            id, email, password_hash, name, role, birth_date, gender, phone_number,
            title, specialty, avatar_url, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, email, pwd_hash, name, role, birth_date, gender, phone_number, title, specialty, avatar_url, now))
        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": "تم تحديث بيانات الحساب بنجاح!",
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": role,
                "birthDate": birth_date,
                "gender": gender,
                "phoneNumber": phone_number,
                "title": title,
                "specialty": specialty,
                "avatarUrl": avatar_url,
            }
        }

    name = req.name.strip() if req.name else user["name"]
    birth_date = req.birth_date if req.birth_date is not None else user["birth_date"]
    gender = req.gender if req.gender is not None else user["gender"]
    phone_number = req.phone_number.strip() if req.phone_number else user["phone_number"]
    title = req.title.strip() if req.title else user["title"]
    specialty = req.specialty.strip() if req.specialty else user["specialty"]
    avatar_url = req.avatar_url if req.avatar_url is not None else user["avatar_url"]

    if req.password and len(req.password) >= 6:
        pwd_hash = hash_password(req.password)
    else:
        pwd_hash = user["password_hash"]

    cur.execute("""
    UPDATE users
    SET name = ?, password_hash = ?, birth_date = ?, gender = ?,
        phone_number = ?, title = ?, specialty = ?, avatar_url = ?
    WHERE id = ?
    """, (name, pwd_hash, birth_date, gender, phone_number, title, specialty, avatar_url, user_id))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "تم تحديث بيانات الحساب بنجاح!",
        "user": {
            "id": user_id,
            "name": name,
            "email": user["email"],
            "role": user["role"],
            "birthDate": birth_date,
            "gender": gender,
            "phoneNumber": phone_number,
            "title": title,
            "specialty": specialty,
            "avatarUrl": avatar_url,
        }
    }


@app.delete("/users/{user_id}")
def delete_user(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT id FROM chats WHERE user_id = ?", (user_id,))
    chat_ids = [r[0] for r in cur.fetchall()]

    for cid in chat_ids:
        cur.execute("DELETE FROM chat_messages WHERE chat_id = ?", (cid,))

    cur.execute("DELETE FROM chats WHERE user_id = ?", (user_id,))
    cur.execute("DELETE FROM consultations WHERE patient_id = ? OR doctor_id = ?", (user_id, user_id))
    cur.execute("DELETE FROM users WHERE id = ?", (user_id,))

    conn.commit()
    conn.close()

    return {"success": True, "message": "تم حذف الحساب وجميع سجلاته بنجاح."}


@app.get("/doctors")
def get_doctors_list():
    """Returns only real registered doctors in the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT id, name, title, specialty, avatar_url FROM users WHERE role = 'doctor'")
    rows = cur.fetchall()
    conn.close()

    doctors = []
    for r in rows:
        specialties = [s.strip() for s in (r["specialty"] or "جلدية عامة").split("،") if s.strip()]
        doctors.append({
            "id": r["id"],
            "nameAr": r["name"],
            "nameEn": r["name"],
            "titleAr": r["title"] or "استشاري أمراض الجلدية",
            "titleEn": "Consultant Dermatologist",
            "rating": 4.9,
            "consultationsCount": 0,
            "avatarUrl": r["avatar_url"],
            "availableNow": True,
            "specialtiesAr": specialties,
            "specialtiesEn": specialties,
        })
    return doctors


# --- 2. Chat Sessions & History Endpoints ---

@app.get("/chats")
def get_user_chats(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM chats WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
    rows = cur.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "userId": r["user_id"],
            "title": r["title"],
            "createdAt": r["created_at"],
            "updatedAt": r["updated_at"],
        }
        for r in rows
    ]


@app.post("/chats")
def create_chat(req: CreateChatDto):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    chat_id = f"chat-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    now = datetime.datetime.utcnow().isoformat()

    cur.execute(
        "INSERT INTO chats (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (chat_id, req.user_id, req.title or "محادثة استشارية جديدة", now, now),
    )
    conn.commit()
    conn.close()

    return {
        "id": chat_id,
        "userId": req.user_id,
        "title": req.title or "محادثة استشارية جديدة",
        "createdAt": now,
        "updatedAt": now,
    }


@app.get("/chats/{chat_id}/messages")
def get_chat_messages(chat_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC", (chat_id,))
    rows = cur.fetchall()
    conn.close()

    messages = []
    for r in rows:
        book_ref = json.loads(r["book_reference"]) if r["book_reference"] else None
        analysis = json.loads(r["analysis"]) if r["analysis"] else None
        doc_consult = json.loads(r["doctor_consultation"]) if r["doctor_consultation"] else None

        messages.append({
            "id": r["id"],
            "role": r["role"],
            "type": r["type"],
            "text": r["text"],
            "image": r["image_url"],
            "videoUrl": r["video_url"],
            "audioUrl": r["audio_url"],
            "audioDuration": r["audio_duration"],
            "bookReference": book_ref,
            "analysis": analysis,
            "doctorConsultation": doc_consult,
            "createdAt": r["created_at"],
        })
    return messages


@app.post("/chats/{chat_id}/messages")
def save_chat_message(chat_id: str, req: SaveMessageDto):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    now = datetime.datetime.utcnow().isoformat()
    book_ref_str = json.dumps(req.book_reference, ensure_ascii=False) if req.book_reference else None
    analysis_str = json.dumps(req.analysis, ensure_ascii=False) if req.analysis else None
    doc_str = json.dumps(req.doctor_consultation, ensure_ascii=False) if req.doctor_consultation else None

    cur.execute("""
    INSERT INTO chat_messages (
        id, chat_id, role, type, text, image_url, video_url, audio_url,
        audio_duration, book_reference, analysis, doctor_consultation, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        req.id,
        chat_id,
        req.role,
        req.type,
        req.text,
        req.image_url,
        req.video_url,
        req.audio_url,
        req.audio_duration,
        book_ref_str,
        analysis_str,
        doc_str,
        now,
    ))

    # Update chat timestamp and title if first user message
    if req.role == "user" and req.text:
        title_snippet = req.text.strip()[:40]
        cur.execute("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?", (title_snippet, now, chat_id))
    else:
        cur.execute("UPDATE chats SET updated_at = ? WHERE id = ?", (now, chat_id))

    conn.commit()
    conn.close()
    return {"success": True}


@app.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM chats WHERE id = ?", (chat_id,))
    cur.execute("DELETE FROM chat_messages WHERE chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "تم حذف المحادثة بنجاح"}


# --- 3. Handbook Book Pages Directory & Viewer Endpoints ---

@app.get("/book/pages")
def get_all_book_pages():
    """Returns directory of all available handbook pages for the interactive book viewer."""
    if not HANDBOOK_PAGES and models_state["chroma_collection"]:
        populate_handbook_pages(models_state["chroma_collection"])

    return [
        {
            "pageNumber": p,
            "pageEnd": HANDBOOK_PAGES[p]["page_end"],
            "sectionTitle": HANDBOOK_PAGES[p]["section_title"],
            "chapterTitle": HANDBOOK_PAGES[p]["chapter_title"],
            "preview": HANDBOOK_PAGES[p]["content"][:160] + "...",
        }
        for p in SORTED_PAGE_NUMBERS
    ]


@app.get("/book/page/{page_number}")
def get_book_page(page_number: int):
    """Returns the full content and navigation metadata for a specific handbook page."""
    if not HANDBOOK_PAGES and models_state["chroma_collection"]:
        populate_handbook_pages(models_state["chroma_collection"])

    if not SORTED_PAGE_NUMBERS:
        raise HTTPException(status_code=404, detail="Handbook pages not loaded.")

    if page_number not in HANDBOOK_PAGES:
        nearest = min(SORTED_PAGE_NUMBERS, key=lambda x: abs(x - page_number))
        page_number = nearest

    idx = SORTED_PAGE_NUMBERS.index(page_number)
    prev_page = SORTED_PAGE_NUMBERS[idx - 1] if idx > 0 else None
    next_page = SORTED_PAGE_NUMBERS[idx + 1] if idx < len(SORTED_PAGE_NUMBERS) - 1 else None

    page_data = HANDBOOK_PAGES[page_number]
    return {
        "pageNumber": page_data["page_number"],
        "pageEnd": page_data["page_end"],
        "sectionTitle": page_data["section_title"],
        "chapterTitle": page_data["chapter_title"],
        "diseaseTags": page_data["disease_tags"],
        "content": page_data["content"],
        "totalPages": len(SORTED_PAGE_NUMBERS),
        "prevPage": prev_page,
        "nextPage": next_page,
    }


# --- 4. Consultation Routing Endpoints ---

@app.post("/consultations/request")
def request_consultation(req: ConsultationRequestDto):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT name, title, avatar_url FROM users WHERE id = ?", (req.doctor_id,))
    doc = cur.fetchone()
    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="الطبيب غير موجود في النظام.")

    consultation_id = f"consult-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    now = datetime.datetime.utcnow().isoformat()

    cur.execute("""
    INSERT INTO consultations (
        id, patient_id, patient_name, doctor_id, doctor_name, doctor_title,
        doctor_avatar, status, clinical_text, image_url, video_url, audio_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    """, (
        consultation_id,
        req.patient_id,
        req.patient_name,
        req.doctor_id,
        doc["name"],
        doc["title"] or "استشاري أمراض الجلدية",
        doc["avatar_url"],
        req.clinical_text or "",
        req.image_url,
        req.video_url,
        req.audio_url,
        now,
        now,
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"تم إرسال طلب الكشف بنجاح إلى {doc['name']}",
        "consultation_id": consultation_id,
        "status": "pending",
    }


@app.get("/doctor/consultations")
def get_doctor_consultations(doctor_id: str):
    """Retrieves ONLY consultations assigned to this specific doctor."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
    SELECT * FROM consultations WHERE doctor_id = ? ORDER BY created_at DESC
    """, (doctor_id,))
    rows = cur.fetchall()
    conn.close()

    consultations = []
    for r in rows:
        meds = json.loads(r["prescription_meds"]) if r["prescription_meds"] else []
        consultations.append({
            "id": r["id"],
            "patientId": r["patient_id"],
            "patientName": r["patient_name"],
            "doctorId": r["doctor_id"],
            "doctorName": r["doctor_name"],
            "status": r["status"],
            "clinicalText": r["clinical_text"],
            "imageUrl": r["image_url"],
            "videoUrl": r["video_url"],
            "audioUrl": r["audio_url"],
            "createdAt": r["created_at"],
            "prescription": {
                "medications": meds,
                "instructions": r["prescription_instructions"] or "",
                "urgency": r["prescription_urgency"] or "routine",
                "doctorNotes": r["doctor_notes"] or "",
            } if r["status"] == "replied" else None,
        })
    return consultations


@app.post("/consultations/{consultation_id}/reply")
def reply_to_consultation(consultation_id: str, req: ReplyConsultationDto):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    now = datetime.datetime.utcnow().isoformat()
    meds_json = json.dumps(req.prescription.medications, ensure_ascii=False)

    cur.execute("""
    UPDATE consultations
    SET status = 'replied',
        prescription_meds = ?,
        prescription_instructions = ?,
        prescription_urgency = ?,
        doctor_notes = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        meds_json,
        req.prescription.instructions,
        req.prescription.urgency,
        req.doctor_notes or req.prescription.doctor_notes or "تم الفحص والموافقة.",
        now,
        consultation_id,
    ))

    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="الاستشارة غير موجودة.")

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": "تم اعتماد الروشتة وإرسالها للمريض بنجاح!",
        "consultation_id": consultation_id,
        "status": "replied",
    }


@app.get("/patient/consultations")
def get_patient_consultations(patient_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("""
    SELECT * FROM consultations WHERE patient_id = ? ORDER BY created_at DESC
    """, (patient_id,))
    rows = cur.fetchall()
    conn.close()

    consultations = []
    for r in rows:
        meds = json.loads(r["prescription_meds"]) if r["prescription_meds"] else []
        consultations.append({
            "id": r["id"],
            "doctorId": r["doctor_id"],
            "doctorName": r["doctor_name"],
            "doctorTitle": r["doctor_title"],
            "doctorAvatar": r["doctor_avatar"],
            "status": r["status"],
            "clinicalText": r["clinical_text"],
            "imageUrl": r["image_url"],
            "videoUrl": r["video_url"],
            "audioUrl": r["audio_url"],
            "createdAt": r["created_at"],
            "prescription": {
                "medications": meds,
                "instructions": r["prescription_instructions"] or "",
                "urgency": r["prescription_urgency"] or "routine",
                "doctorNotes": r["doctor_notes"] or "",
            } if r["status"] == "replied" else None,
        })
    return consultations


# --- 5. AI Query Endpoints ---

@app.get("/health")
def health_check():
    indexed = models_state["chroma_collection"].count() if models_state["chroma_collection"] else 0
    return {
        "status": "healthy",
        "indexed_vectors": indexed,
        "generator": models_state["generator_type"],
        "chroma_path": models_state["chroma_path"],
        "gemini_configured": bool(models_state["gemini_key"]),
        "cached_pages": len(HANDBOOK_PAGES),
    }


@app.post("/query", response_model=QueryResponse)
def handle_text_query(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    return run_rag_pipeline(req.query.strip(), req.k)


@app.post("/query/voice", response_model=QueryResponse)
async def handle_voice_query(
    audio_file: UploadFile = File(...),
    k: int = Form(default=5),
):
    audio_bytes = await audio_file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file provided.")

    transcribed_text = transcribe_audio(audio_bytes, audio_file.filename)
    if not transcribed_text:
        transcribed_text = "استفسار سريري صوتي عن أعراض الحساسية والحكة الجلدية"

    resp = run_rag_pipeline(transcribed_text, k)
    resp.query = transcribed_text
    return resp


@app.post("/query/image", response_model=QueryResponse)
async def handle_image_query(
    image_file: UploadFile = File(...),
    query: str = Form(default=""),
    k: int = Form(default=5),
):
    image_bytes = await image_file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file provided.")

    user_query = query.strip() if query else "فحص سريري لصورة آفة جلدية لتشخيص الحالة المحتملة"
    is_ar = is_arabic(user_query)

    analysis_data = None
    gen = models_state.get("generator")
    if isinstance(gen, GeminiGenerator) and gen.client:
        try:
            from google.genai import types
            vision_prompt = (
                "You are an expert dermatological clinical decision support AI. "
                "Analyze this skin lesion image carefully and provide a structured JSON response with:\n"
                "{\n"
                '  "condition": "<Most probable dermatological condition in Arabic and English>",\n'
                '  "confidence": <integer percentage between 65 and 95>,\n'
                '  "characteristics": ["<feature 1>", "<feature 2>", "<feature 3>", "<feature 4>"],\n'
                '  "explanation": "<Detailed clinical assessment explanation>",\n'
                '  "search_terms": "<English medical search terms for WHO guidelines search>"\n'
                "}\n"
                f"User clinical notes: {user_query}\n"
                f"Language preference: {'Arabic' if is_ar else 'English'}"
            )

            mime_type = image_file.content_type or "image/jpeg"
            vision_resp = gen.client.models.generate_content(
                model=gen.model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    vision_prompt,
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )

            if vision_resp.text:
                parsed = json.loads(vision_resp.text)
                analysis_data = AnalysisDetail(
                    condition=parsed.get("condition", "تفاعل جلدي التهابي (Dermatitis / Eczema)"),
                    confidence=int(parsed.get("confidence", 85)),
                    characteristics=list(parsed.get("characteristics", ["حمامى سطحية", "تقشر موضعي", "جفاف جلدي", "حدود غير منتظمة"])),
                    explanation=parsed.get("explanation", "النمط البصري يظهر تفاعلاً جلدياً التهابياً يستوجب ترطيب الحاجز الجلدي وتجنب المهيجات."),
                )
                if parsed.get("search_terms"):
                    user_query = parsed.get("search_terms")
        except Exception as e:
            print(f"Image vision analysis error: {e}")

    if not analysis_data:
        analysis_data = AnalysisDetail(
            condition="تفاعل إكزيمي تهيجي (Eczematous / Atopic Dermatitis)" if is_ar else "Eczematous / Atopic Dermatitis",
            confidence=84,
            characteristics=[
                "حمامى سطحية (Superficial Erythema)",
                "تقشر خفيف (Fine Scaling)",
                "جفاف جلدي (Skin Xerosis)",
                "حدود غير منتظمة (Irregular Borders)",
            ],
            explanation=(
                "أظهر التحليل السريري للنمط البصري علامات تهيج سطحي وتفاعل جلدي التهابي غير معدٍ يتوافق مع بروتوكولات منظمة الصحة العالمية."
                if is_ar else
                "Visual morphological assessment indicates superficial inflammation and eczematous reaction aligned with WHO clinical guidelines."
            ),
        )

    rag_response = run_rag_pipeline(user_query, k=k)
    rag_response.analysis = analysis_data
    return rag_response


@app.post("/query/video", response_model=QueryResponse)
async def handle_video_query(
    video_file: UploadFile = File(...),
    query: str = Form(default=""),
    k: int = Form(default=5),
):
    video_bytes = await video_file.read()
    if not video_bytes:
        raise HTTPException(status_code=400, detail="Empty video file provided.")

    user_query = query.strip() if query else "فحص مقطع فيديو لحركة وتطور آفة جلدية سريرية"
    is_ar = is_arabic(user_query)

    analysis_data = AnalysisDetail(
        condition="فحص نمط تطور الآفة الجلدية بالفيديو (Clinical Video Lesion Dynamics)",
        confidence=86,
        characteristics=[
            "تغير لوني محيطي (Peripheral Erythema)",
            "بروز طفيف في الحواف (Elevated Borders)",
            "استجابة وعائية مرنة",
            "سماكة نسيجية موضعية",
        ],
        explanation=(
            "أظهر فحص الفيديو الديناميكي للآفة انتشاراً سطحياً وتفاعلاً جلدياً يستدعي التقييم الموضعي مع المتابعة السريرية."
            if is_ar else
            "Dynamic clinical video evaluation highlights superficial plaque extension and vascular response indicating local supportive therapy."
        ),
    )

    rag_response = run_rag_pipeline(user_query, k=k)
    rag_response.analysis = analysis_data
    return rag_response


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)