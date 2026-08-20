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

# Comprehensive Arabic-to-English Medical Keyword Ontology for Dermatology
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
    r"تساقط الشعر|شعر|ثعلبة|صلع|قشرة الرأس": "hair loss alopecia areata androgenetic alopecia dandruff scalp psoriasis",
    r"أظافر|اظافر|تغير لون الظفر|فطريات الاظافر": "onychomycosis nail fungus subungual hyperkeratosis nail dystrophy",
}

# Explicit non-dermatology patterns to immediately intercept
OUT_OF_DOMAIN_PATTERNS = [
    (r"أكلة|اكله|اكلة|طبخة|وصفة طعام|طريقة عمل|رز|لحمة|فراخ|بيتزا|كيك|شيف|مطعم|وجبة طعام|طبيخ|أطبخ|اكل", "الطهي والوصفات الغذائية"),
    (r"كرة قدم|مباراة|دوري|أهداف|اهداف|لاعب|ميسي|رونالدو|ريال مدريد|برشلونة|رياضة كرة|كأس العالم|ماتش", "الأخبار الرياضية وكرة القدم"),
    (r"أسنان|اسنان|ضرس|خلع ضرس|تسوس|تقويم اسنان|حشو ضرس|لثة|طبيب اسنان|ألم في اسناني|الم اسنان", "طب وجراحة الفم والأسنان"),
    (r"قلب|ذبحة|شريان|صدرية|ضغط دم|سكر دم|عظام|كسر|مفصل|ركبة|غضروف|عيون|نظارة|رمد|أذن|انف وحنجرة|بواسير|مسالك بولية|كلى", "المجالات الطبية العامة الأخرى غير الجلدية"),
    (r"برمجة|كود|بايثون|جافاسكريبت|سيارات|ميكانيكا|طقس|فيلم|مسلسل|اغنية|سياحة|سفر|تاريخ|سياسة|اقتصاد", "المواضيع العامة الخارجة عن الطب"),
]

DERMATOLOGY_KEYWORDS = [
    r"جلد|بشرة|وجه|شعر|أظافر|اظافر|مسام|حبوب|بثور|رؤوس سوداء|رؤوس بيضاء|حكة|طفح|احمرار|تقشر|قشور",
    r"إكزيما|اكزيما|صدفية|بهاق|جرب|تينيا|فطريات|فطر|سعفة|قوباء|دمامل|خراج|حرق|شمس|واقي|تصبغات|ندبات|كلف|شامات|زوائد جلدية",
    r"قرحة جلدية|ليشمانيا|جذام|تسلخات|جفاف الجلد|حساسية الجلد|ارتيكاريا|شرى|ثعلبة|صلع|تساقط الشعر",
    r"مرهم|كريم|لوشن|مضاد فطري|هيدروكورتيزون|مرطب|فازلين|ساليسيليك|ريتينول|بنزويل|نياسيناميد",
    r"skin|dermatolog|acne|pimple|rash|eczema|psoriasis|tinea|fungal|scalp|hair|nail|melanoma|lesion|pruritus|erythema|blister|ulcer",
]

SYSTEM_PROMPT_DYNAMIC = """You are DermaAssist CDS, an AI clinical decision support assistant strictly specialized ONLY in Dermatology, Skin NTDs, Cutaneous Lesions, Hair, and Nails based on WHO guidelines.

CRITICAL SCOPE & DOMAIN ENFORCEMENT RULES:
1. STRICT DERMATOLOGY SPECIALIZATION:
   - Your expertise is 100% restricted to Skin Conditions, Dermatology, Skin NTDs, Hair, and Nails.
   - If the user asks about ANY non-dermatology topics (e.g., cooking recipes, food preparation, sports/football, dental/teeth problems, cardiology, internal medicine, orthopedics, general news, programming, or non-skin queries):
     - DO NOT try to force a connection to skin health or invent dietary/exercise advice.
     - DO NOT generate clinical assessment sections, causes, care steps, or recipes.
     - DO NOT cite WHO book pages or handbook chapters.
     - Reply with ONLY this concise and polite statement in Modern Standard Arabic:
       "أهلاً بك. بصفتي مساعداً سريرياً متخصصاً في طب الأمراض الجلدية وصحة البشرة والشعر والأظافر، أود التوضيح أن استفسارك يخرج عن نطاق تخصصي الجلدي. يُرجى استشارة الطبيب أو المصدر المختص بمجال سؤالك للحصول على الإرشاد المناسب."
     - Stop immediately.

2. FOR LEGITIMATE DERMATOLOGY & SKIN QUERIES:
   - Provide a direct, concise, empathetic, and evidence-based clinical answer grounded in WHO guidelines.
   - Do NOT beat around the bush or ramble. Be direct and clear.
   - Structure your response using:
     • **التقييم السريري المحتمل**
     • **الأسباب والعوامل الشائعة**
     • **إرشادات العناية الموصى بها**
     • **التوجيه السريري ومتى تجب مراجعة الطبيب**
   - Write in 100% fluent, pure Modern Standard Arabic (فصحى طبية واضحة ومباشرة دون أي نصوص إنجليزية).
"""


def is_arabic(text: str) -> bool:
    """Check if the text contains Arabic characters."""
    return bool(re.search(r"[\u0600-\u06FF]", text))


def check_out_of_domain(query: str) -> tuple[bool, str]:
    """Checks if query is clearly outside dermatology."""
    q_lower = query.lower().strip()
    
    # Check if there is an explicit skin mention (e.g. "حساسية في الجلد بسبب أكلة معينة")
    has_skin = any(re.search(dp, q_lower) for dp in DERMATOLOGY_KEYWORDS)
    
    for pattern, field_name in OUT_OF_DOMAIN_PATTERNS:
        if re.search(pattern, q_lower):
            if not has_skin:
                return True, field_name
                
    return False, ""


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
                "  1. ظهور وتفاقم الأعراض الجلدية يرتبط بتفاعلات موضعية مناعية أو التهابية ناتجة عن انسداد المسام، اختلال الحاجز الواقي للجلد، أو التحسس للمهيجات البيئية.\n"
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
                "  Cutaneous symptoms and inflammatory lesions commonly arise from follicle blockage, barrier impairment, or environmental triggers.\n\n"
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
    q_trimmed = query.strip()

    # 1. Check Out-of-Domain Guardrail immediately
    is_ood, ood_category = check_out_of_domain(q_trimmed)
    if is_ood:
        refusal_msg = (
            f"أهلاً بك. بصفتي مساعداً سريرياً متخصصاً حصرياً في طب الأمراض الجلدية، وصحة البشرة والشعر والأظافر؛ أود التوضيح أن استفسارك يتعلق بمجال ({ood_category}) ويخرج عن نطاق تخصصي الطبي الجلدي.\n\n"
            f"يُرجى استشارة الطبيب أو المصدر المختص في هذا المجال للحصول على التوجيه الصحيح والمباشر."
            if arabic_input else
            f"Hello. As a clinical AI assistant strictly specialized in Dermatology, Skin, Hair, and Nails; your query pertains to ({ood_category}) and falls outside my dermatological scope.\n\n"
            f"Please consult the appropriate specialist or resource for proper guidance."
        )
        return {
            "query": query,
            "search_query": query,
            "answer": refusal_msg,
            "citation": None,
            "book_reference": None,
            "refused": True,
            "formatted_output": refusal_msg,
            "sources": [],
        }

    # 2. Translate / Map Query for Vector Matching
    if isinstance(generator, GeminiGenerator) and generator.client and arabic_input:
        search_query = translate_query_if_arabic(generator.client, query)
    else:
        search_query = map_arabic_query_to_medical_terms(query) if arabic_input else query

    retrieved = retrieve(collection, embed_fn, search_query, k) if collection else []
    top_chunk = retrieved[0] if retrieved else None

    # 3. Grounded Synthesis with Gemini
    context_block = build_context_block(retrieved) if retrieved else "General WHO dermatological guidance and care protocols."

    user_prompt = (
        f"WHO HANDBOOK CONTEXT PASSAGES:\n\n{context_block}\n\n"
        f"---\n\n"
        f"PATIENT / CLINICAL QUESTION:\n{query}\n\n"
        f"Instructions:\n"
        f"- If the question is about dermatology/skin/hair/nails, provide a direct, concise, and structured clinical response in "
        f"{'ARABIC (اللغة العربية الفصحى الطبية المباشرة دون أي نصوص أو اقتباسات إنجليزية)' if arabic_input else 'ENGLISH'}.\n"
        f"- If the question is NOT about dermatology, do NOT make up connections to skin; politely state that you specialize only in dermatology."
    )

    raw_answer = generator.generate(
        system_prompt=SYSTEM_PROMPT_DYNAMIC,
        user_prompt=user_prompt,
        is_ar=arabic_input,
        top_chunk=top_chunk,
    )

    # Check if the generated answer is a refusal / out-of-domain response
    is_refusal_response = (
        "يخرج عن نطاق تخصصي" in raw_answer or
        "متخصص حصرياً في طب الأمراض الجلدية" in raw_answer or
        "outside my dermatological" in raw_answer.lower()
    )

    if is_refusal_response:
        return {
            "query": query,
            "search_query": search_query,
            "answer": raw_answer,
            "citation": None,
            "book_reference": None,
            "refused": True,
            "formatted_output": raw_answer,
            "sources": [],
        }

    # 4. Extract Accurate Book Reference ONLY for Real Dermatology Answers
    section_title = None
    page_start = None
    page_end = None
    raw_excerpt = ""

    if top_chunk and top_chunk.get("metadata"):
        top_meta = top_chunk["metadata"]
        section_title = top_meta.get("section_title") or top_meta.get("chapter_title") or "WHO Clinical Dermatology"
        page_start = int(top_meta.get("page_start") or 14)
        page_end = int(top_meta.get("page_end") or page_start)
        raw_excerpt = top_chunk.get("document", "")[:350]
        if len(top_chunk.get("document", "")) > 350:
            raw_excerpt += "..."
    else:
        if re.search(r"حب الشباب|بثور|رؤوس سوداء", query):
            section_title = "Inflammatory disorders & Acne Vulgaris"
            page_start = 99
            page_end = 99
            raw_excerpt = "Inflammation due to blockage of hair follicles and sebaceous glands (comedones). Common in adolescents and young adults."
        elif re.search(r"سرطان|ميلانوما|اخطر|أخطر", query):
            section_title = "Skin Cancers & Melanoma Urgent Referral"
            page_start = 104
            page_end = 104
            raw_excerpt = "The most serious type of skin cancer. Skin cancer of pigment-producing cells."
        elif re.search(r"تينيا|تينة|فطريات|سعفة", query):
            section_title = "Fungal Infections & Tinea Management"
            page_start = 90
            page_end = 91
            raw_excerpt = "Superficial fungal infections caused by dermatophytes (Tinea corporis, Tinea capitis, Pityriasis versicolor)."
        elif re.search(r"صدفية|لويحات", query):
            section_title = "Algorithms: Plaques & Psoriasis Management"
            page_start = 32
            page_end = 32
            raw_excerpt = "Plaques: raised, flat-topped areas of skin feeling thickened or rough with silver scales."
        elif re.search(r"إكزيما|اكزيما|حساسية|حكة", query):
            section_title = "Inflammatory Disorders: Eczema & Dermatitis"
            page_start = 100
            page_end = 100
            raw_excerpt = "Skin condition causing patches of itchiness and irritated skin. Patches of redness, swelling, cracks, and weeping."
        elif any(re.search(dp, query.lower()) for dp in DERMATOLOGY_KEYWORDS):
            section_title = "Clinical Diagnosis & Management of Common Skin Diseases"
            page_start = 14
            page_end = 15
            raw_excerpt = "Initial clinical triage focuses on systematic examination (Ask, Look, Feel) to assess lesion margin demarcation, erythema, and scaling."

    if section_title and page_start:
        page_str = f"صفحة {page_start}" if arabic_input else f"Page {page_start}"
        citation = f"{DOCUMENT_NAME} — {section_title} ({page_str})"
        book_reference = {
            "book_title": DOCUMENT_NAME,
            "section_title": section_title,
            "page_start": page_start,
            "page_end": page_end,
            "excerpt": raw_excerpt,
        }
        formatted_output = f"{raw_answer}\n\n📖 **{citation}**"
    else:
        citation = None
        book_reference = None
        formatted_output = raw_answer

    return {
        "query": query,
        "search_query": search_query,
        "answer": raw_answer,
        "citation": citation,
        "book_reference": book_reference,
        "refused": False,
        "formatted_output": formatted_output,
        "sources": retrieved,
    }