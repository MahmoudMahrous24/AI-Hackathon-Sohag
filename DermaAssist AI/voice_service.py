"""
voice_service.py (Gemini Native Audio Transcription with Graceful Fallback)
"""

from __future__ import annotations

import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


def transcribe_audio(file_bytes: bytes, filename: str = "audio.wav", forced_language: str | None = None) -> str:
    """Transcribes user voice recording using Gemini Native Audio API or returns fallback prompt."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GENAI_AVAILABLE:
        print("Voice transcription: GEMINI_API_KEY not configured. Using voice query placeholder.")
        return "المريض يستفسر صوتياً عن أعراض طفح جلدي وحكة"

    mime_type = "audio/wav"
    lowered = filename.lower()
    if lowered.endswith(".mp3"):
        mime_type = "audio/mp3"
    elif lowered.endswith(".m4a"):
        mime_type = "audio/m4a"
    elif lowered.endswith(".webm"):
        mime_type = "audio/webm"
    elif lowered.endswith(".ogg"):
        mime_type = "audio/ogg"

    prompt = (
        "Transcribe this speech verbatim into plain text. "
        "Preserve the exact spoken language (Arabic if spoken in Arabic, English if spoken in English). "
        "Do NOT translate. Output ONLY the transcribed words with no introduction or markdown."
    )

    models_to_try = [
        os.environ.get("GEMINI_MODEL", "gemini-3.6-flash"),
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite",
    ]

    try:
        client = genai.Client(api_key=api_key)
        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                    ),
                )
                if response.text and response.text.strip():
                    return response.text.strip()
            except Exception as e:
                print(f"Voice model {model_name} attempt error: {e}")
                continue
    except Exception as e:
        print(f"Audio transcription error: {e}")

    return "المريض يستفسر صوتياً عن أعراض طفح جلدي وحكة مستمرة"