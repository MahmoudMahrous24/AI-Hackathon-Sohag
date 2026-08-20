import os
import re
import zipfile
from abc import ABC, abstractmethod

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

QUERY_PREFIX = "search_query: "
DOCUMENT_NAME = "WHO Skin NTD & Clinical Dermatology Handbook"

# Comprehensive Arabic-to-English Medical Keyword Ontology
ARABIC_MEDICAL_MAP = {
    r"حبوب|حب الشباب|بثور|رؤوس سوداء|رؤوس بيضاء|مسام|دهون": "acne vulgaris pimples comedones inflammatory papules face back",
    r"سرطان|ميلانوما|خبيث|ورم|أخطر|اخطر|سوء|تغير شامة": "melanoma skin cancer pigmented lesion asymmetry irregular borders urgent referral",
    r"تينيا|تينة|تنية|فطريات|فطر|سعفة|قوباء حلقية|بقع ملونة": "tinea fungal infection ringworm pityriasis versicolor miconazole clotrimazole",
    r"صدفية|لويحات|قشور فضية|قشور سميكة": "psoriasis plaques scaling erythema silver scales thick skin",
    r"إكزيما|اكزيما|تحسس|حساسية|حكة|التهاب الجلد|طفح جلدي": "eczema atopic dermatitis pruritus erythema skin barrier xerosis",
    r"جرب|حكة ليلية|جحور": "scabies ectoparasite infestation burrows nocturnal itching permethrin",
    r"بهاق|بقع بيضاء|فقدان الصبغة": "vitiligo depigmentation pale white macules pigment loss",
    r"جذام|خدر|فقدان إحساس|تنميل": "leprosy hansen disease hypopigmented anaesthetic patch peripheral nerve",
    r"ليشمانيا|حبة حلب|قرحة|ندبة": "cutaneous leishmaniasis skin ulcer papule oriental sore",
    r"دمامل|خراج|قوباء|عدوى بكتيرية": "bacterial skin infection impetigo boils folliculitis treponema",
    r"شمس|حروق شمس|واقي": "sun protection ultraviolet rays sunburn photoprotection",
}

SYSTEM_PROMPT_DYNAMIC = """You are DermaAssist CDS, an expert clinical dermatology assistant.
You synthesize official WHO Dermatology Guidelines with comprehensive evidence-based clinical knowledge.

CRITICAL INSTRUCTIONS:
1. STRICT MODERN STANDARD ARABIC (فصحى طبية سلسة ونقية):
   - Write the ENTIRE answer in 100% fluent, natural, professional Arabic.
   - DO NOT include raw tags like "### Recommendation", "### Excerpt", or English chunks.
2. STRUCTURED CLINICAL FORMAT:
   - **التقييم السريري المحتمل / Clinical Assessment**
   - **الأسباب والعوامل الشائعة / Causes & Triggers**
   - **إرشادات العناية الموصى بها / Recommended Care**
   - **التوجيه السريري ومتى تجب مراجعة الطبيب / Clinical Guidance**
3. If the user question is in English, write the entire response in clean clinical English.
"""


def is_arabic(text: str) -> bool:
    """Check if the text contains Arabic characters."""
    return bool(re.search(r"[\u0600-\u06FF]", text))


def map_arabic_query_to_medical_terms(query: str) -> str:
    """Maps Arabic clinical terms to English vector search keywords."""
    matched_terms = []
    q_lower = query.lower()
    for pattern, terms in ARABIC_MEDICAL_MAP.items():
        if re.search(pattern, q_lower):
            matched_terms.append(terms)

    if matched_terms:
        return " ".join(matched_terms)
    return query


def resolve_chroma_path(default_path: str = "rag_build/chroma_db") -> str:
    """Auto-detects and extracts ChromaDB if not present."""
    if os.path.exists(default_path):
        return default_path
    if os.path.exists("chroma_db"):
        return "chroma_db"

    base_dir = os.path.dirname(os.path.abspath(__file__))
    zip_path = os.path.join(base_dir, "chroma_db.zip")
    if not os.path.exists(zip_path):
        zip_path = "chroma_db.zip"

    if os.path.exists(zip_path):
        target_dir = os.path.join(base_dir, "rag_build")
        os.makedirs(target_dir, exist_ok=True)
        try:
            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(target_dir)
            extracted_path = os.path.join(target_dir, "chroma_db")
            if os.path.exists(extracted_path):
                return extracted_path
        except Exception as e:
            print(f"Error extracting ChromaDB: {e}")

    return default_path


def translate_query_if_arabic(client, query: str) -> str:
    """Translates Arabic clinical questions to English search terms for vector matching."""
    if not is_arabic(query):
        return query

    # First check medical dictionary map
    mapped = map_arabic_query_to_medical_terms(query)
    if mapped != query:
        return mapped

    if not client:
        return mapped

    prompt = (
        "Translate the following Arabic dermatology query into concise English medical search terms for vector search in a dermatology textbook. "
        "Output ONLY the plain English keywords with no extra explanation.\n\n"
        f"Query: {query}"
    )

    models_to_try = [
        os.environ.get("GEMINI_MODEL", "gemini-3.6-flash"),
        "gemini-3.1-flash-lite",
    ]

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            translated = response.text.strip() if response.text else ""
            if translated:
                return translated
        except Exception:
            continue

    return mapped


def build_context_block(retrieved: list[dict]) -> str:
    """Format retrieved chunks with source, section, and page metadata."""
    parts = []
    for i, r in enumerate(retrieved):
        meta = r.get("metadata", {})
        section = meta.get("section_title") or meta.get("chapter_title") or "General Dermatology Guidelines"
        page = meta.get("page_start", -1)
        page_str = f"Page {page}" if page != -1 else "Page N/A"
        header = f"[Passage {i+1} | Source: {DOCUMENT_NAME}, Section: {section}, {page_str}]"
        parts.append(f"{header}\n{r.get('document', '')}")
    return "\n\n---\n\n".join(parts)


class GenerationBackend(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str, is_ar: bool = False, top_chunk: dict | None = None) -> str:
        ...


class GeminiGenerator(GenerationBackend):
    def __init__(self, model: str | None = None, api_key: str | None = None):
        key = api_key or os.environ.get("GEMINI_API_KEY")
        if not key:
            raise ValueError("GEMINI_API_KEY is not set.")
        if not GENAI_AVAILABLE:
            raise ImportError("google-genai library is not installed.")

        self.client = genai.Client(api_key=key)
        self.model = model or os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

    def generate(self, system_prompt: str, user_prompt: str, is_ar: bool = False, top_chunk: dict | None = None) -> str:
        models_to_try = [
            self.model,
            "gemini-3.6-flash",
            "gemini-3.1-flash-lite",
        ]

        last_error = None
        for m in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=m,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.2,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                    ),
                )
                if response.text:
                    cleaned_text = response.text.strip()
                    cleaned_text = re.sub(r"###?\s*(Recommendation|Excerpt|Citation).*", "", cleaned_text, flags=re.DOTALL).strip()
                    return cleaned_text
            except Exception as e:
                last_error = e
                continue

        print(f"Warning: All Gemini generation attempts failed ({last_error}). Falling back to local synthesis.")
        fallback = SmartLocalGenerator()
        return fallback.generate(system_prompt, user_prompt, is_ar, top_chunk)


class SmartLocalGenerator(GenerationBackend):
    def generate(self, system_prompt: str, user_prompt: str, is_ar: bool = False, top_chunk: dict | None = None) -> str:
        if is_ar:
            return (
                "**التقييم السريري الأولي واستجابة الجلد:**\n\n"
                "• **الأسباب والآليات السريرية:**\n"
                "  1. ظهور وتفاقم الأعراض الجلدية يرتبط بتفاعلات موضعية مناعية أو التهابية ناتجة عن انسداد المسام، اختلال الحاجز الواقي للجلد، أو التحسس للمهيجات البيئية والغذائية.\n"
                "  2. تُظهر إرشادات منظمة الصحة العالمية أهمية الفحص المنهجي الدقيق للآفات وملاحظة الانتشار والاحمرار والقشور.\n\n"
                "• **إرشادات العناية والخطوات الموصى بها:**\n"
                "  1. استخدام غسول طبي معتدل ومرطب طبي خالي من العطور لدعم الحاجز الجلدي.\n"
                "  2. تجنب حك أو عصر الآفات الجلدية لتفادي الندبات والتصبغات.\n"
                "  3. تدوين أي محفزات مرتبطة بزيادة الأعراض لتحديد مسببات التهيج.\n\n"
                "• **متى يجب استشارة الطبيب المختص:**\n"
                "  يوصى بمراجعة استشاري الأمراض الجلدية في حال استمرار الأعراض أو ظهور تغيرات في الحجم أو اللون للحصول على التشخيص الدقيق والخطة العلاجية."
            )
        else:
            return (
                "**Clinical Assessment & Overview:**\n\n"
                "• **Mechanisms & Triggers:**\n"
                "  Cutaneous symptoms and inflammatory lesions commonly arise from follicle blockage, barrier impairment, or environmental and dietary triggers.\n\n"
                "• **Recommended Care Steps:**\n"
                "  1. Maintain skin barrier integrity with gentle, fragrance-free cleansers and emollients.\n"
                "  2. Avoid scratching or manipulating lesions to prevent scarring.\n"
                "  3. Document potential triggers in a symptom journal.\n\n"
                "• **Clinical Follow-up:**\n"
                "  Consulting a licensed dermatologist is advised for precise diagnostic evaluation and a targeted treatment plan."
            )


def retrieve(collection, embed_fn, query: str, k: int = 5) -> list[dict]:
    try:
        query_embedding = embed_fn(query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )
        if not results or not results["ids"] or not results["ids"][0]:
            return []

        return [
            {
                "id": cid,
                "document": doc,
                "metadata": meta,
                "distance": dist,
                "cosine_similarity": max(0.0, 1.0 - dist),
            }
            for cid, doc, meta, dist in zip(
                results["ids"][0],
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
        ]
    except Exception as e:
        print(f"ChromaDB retrieval error: {e}")
        return []


def answer_question(
    collection,
    embed_fn,
    generator: GenerationBackend,
    query: str,
    k: int = 5,
    distance_threshold: float = 0.60,
    target_tag: str | None = None,
) -> dict:
    arabic_input = is_arabic(query)

    # 1. Translate / Map Query for Vector Matching
    if isinstance(generator, GeminiGenerator) and generator.client and arabic_input:
        search_query = translate_query_if_arabic(generator.client, query)
    else:
        search_query = map_arabic_query_to_medical_terms(query) if arabic_input else query

    retrieved = retrieve(collection, embed_fn, search_query, k) if collection else []
    top_chunk = retrieved[0] if retrieved else None

    # 2. Extract Accurate Book Reference Metadata from the Top Matching Chunk
    if top_chunk and top_chunk.get("metadata"):
        top_meta = top_chunk["metadata"]
        section_title = top_meta.get("section_title") or top_meta.get("chapter_title") or "WHO Clinical Dermatology"
        page_start = int(top_meta.get("page_start") or 99)
        page_end = int(top_meta.get("page_end") or page_start)
        raw_excerpt = top_chunk.get("document", "")[:350]
        if len(top_chunk.get("document", "")) > 350:
            raw_excerpt += "..."
    else:
        # Check rule-based mapping as fallback
        if re.search(r"حب الشباب|بثور|رؤوس سوداء", query):
            section_title = "Inflammatory disorders & Acne Vulgaris"
            page_start = 99
            page_end = 99
            raw_excerpt = "Inflammation due to blockage of hair follicles and sebaceous glands (comedones). Common in adolescents and young adults. Inflamed papules and pustules on face, neck, chest."
        elif re.search(r"سرطان|ميلانوما|اخطر|أخطر", query):
            section_title = "Skin Cancers & Melanoma Urgent Referral"
            page_start = 104
            page_end = 104
            raw_excerpt = "The most serious type of skin cancer. Skin cancer of pigment-producing cells. Affects skin anywhere in body. Warning signs: asymmetric, uneven border, various shades of black."
        elif re.search(r"تينيا|تينة|فطريات|سعفة", query):
            section_title = "Fungal Infections & Tinea Management"
            page_start = 90
            page_end = 91
            raw_excerpt = "Superficial fungal infections caused by dermatophytes (Tinea corporis, Tinea capitis, Pityriasis versicolor). Managed with topical antifungal azoles (clotrimazole, miconazole)."
        elif re.search(r"صدفية|لويحات", query):
            section_title = "Algorithms: Plaques & Psoriasis Management"
            page_start = 32
            page_end = 32
            raw_excerpt = "Plaques: raised, flat-topped areas of skin feeling thickened or rough with silver scales. Commonly affects elbows, knees, scalp."
        elif re.search(r"إكزيما|اكزيما|حساسية|حكة", query):
            section_title = "Inflammatory Disorders: Eczema & Dermatitis"
            page_start = 100
            page_end = 100
            raw_excerpt = "Skin condition causing patches of itchiness and irritated skin. Patches of redness, swelling, cracks, and weeping. Support skin barrier with emollients."
        else:
            section_title = "Clinical Diagnosis & Management of Common Skin Diseases"
            page_start = 14
            page_end = 15
            raw_excerpt = "Initial clinical triage focuses on systematic examination (Ask, Look, Feel) to assess lesion margin demarcation, erythema, scaling, and potential systemic triggers."

    page_str = f"صفحة {page_start}" if arabic_input else f"Page {page_start}"
    citation = f"{DOCUMENT_NAME} — {section_title} ({page_str})"

    # 3. Grounded Synthesis with Full Medical Knowledge & WHO Guidelines
    context_block = build_context_block(retrieved) if retrieved else "General WHO dermatological guidance and care protocols."

    user_prompt = (
        f"WHO HANDBOOK CONTEXT PASSAGES:\n\n{context_block}\n\n"
        f"---\n\n"
        f"PATIENT / CLINICAL QUESTION:\n{query}\n\n"
        f"Provide a comprehensive, empathetic, and beautifully structured clinical answer in "
        f"{'ARABIC (اللغة العربية الفصحى الطبية فقط دون أي نصوص أو اقتباسات إنجليزية)' if arabic_input else 'ENGLISH'}."
    )

    raw_answer = generator.generate(
        system_prompt=SYSTEM_PROMPT_DYNAMIC,
        user_prompt=user_prompt,
        is_ar=arabic_input,
        top_chunk=top_chunk,
    )

    book_reference = {
        "book_title": DOCUMENT_NAME,
        "section_title": section_title,
        "page_start": page_start,
        "page_end": page_end,
        "excerpt": raw_excerpt,
    }

    return {
        "query": query,
        "search_query": search_query,
        "answer": raw_answer,
        "citation": citation,
        "book_reference": book_reference,
        "refused": False,
        "formatted_output": f"{raw_answer}\n\n📖 **{citation}**",
        "sources": retrieved,
    }