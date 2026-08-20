"""
build_vector_store.py
======================
Embeds chunks_clean.jsonl and loads them into a local, persistent Chroma
collection.

EMBEDDING MODEL: nomic-embed-text-v1.5, free and local via
sentence-transformers -- no API, no cost, same approach as the rest of
this pipeline. Chosen specifically over smaller/faster options (e.g.
all-MiniLM-L6-v2 at 256 tokens, bge-base at 512) because your hand-
transcribed diagnostic_algorithm chunks run 500-630 tokens -- a
256/512-token model would silently truncate them, cutting off exactly
the safety-critical urgency-tagged content near the end of the
transcription. nomic-embed-text-v1.5 supports 8192 tokens, comfortably
covering every chunk in this dataset (verified: longest chunk here is
~630 tokens).

USAGE QUIRK: nomic-embed-text-v1.5 requires a task-instruction prefix on
every input -- "search_document: " when embedding chunks to index,
"search_query: " when embedding a person's question at retrieval time.
Mixing these up (or omitting them) measurably hurts retrieval quality
with this model family. This script handles the document side; see
query_store.py for the query side.

One-time setup:
    pip install sentence-transformers chromadb
    # First run downloads the model (~550MB) from Hugging Face -- make
    # sure that's reachable, same as the unstructured hi_res model was.

Usage:
    python build_vector_store.py rag_build/chunks_enriched.jsonl \
        --persist-dir rag_build/chroma_db
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Optional

from clean_chunks import clean_chunks
from section_chunker import KNOWN_DISEASE_TAGS

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"
DOCUMENT_PREFIX = "search_document: "


def flatten_metadata(chunk: dict) -> dict:
    """Chroma metadata values must be str/int/float/bool -- flatten the
    nested section_path and list fields into scalar strings.

    disease_tags is stored BOTH as a comma-joined string (for display in
    query_store.py's printed output) AND as one boolean field per known
    tag (disease_leprosy, disease_scabies, ...). The boolean fields are
    what filtering actually uses -- Chroma's `where` clause only supports
    equality/membership on metadata values, not substring matching
    ("$contains" is for where_document full-text search only, confirmed
    by testing: it silently returns zero results when used on a metadata
    field instead of erroring, which is what caused this bug in the
    first place). Equality on a per-tag boolean is the standard Chroma
    pattern for this kind of multi-value tag filtering.
    """
    sp = chunk.get("section_path", {}) or {}
    tags_present = set(chunk.get("disease_tags", []) or [])
    meta = {
        "content_type": chunk["content_type"],
        "page_start": chunk.get("page_start") or -1,
        "page_end": chunk.get("page_end") or -1,
        "disease_tags": ",".join(sorted(tags_present)),
        "chapter_title": sp.get("chapter_title") or "",
        "section_number": sp.get("section_number") or "",
        "section_title": sp.get("section_title") or "",
        "subsection_number": sp.get("subsection_number") or "",
        "subsection_title": sp.get("subsection_title") or "",
        "box_title": sp.get("box_title") or "",
        "annexure_number": sp.get("annexure_number") or "",
        "annexure_title": sp.get("annexure_title") or "",
        "source_filename": chunk.get("source_filename") or "",
        "manual_transcription": bool(chunk.get("manual_transcription", False)),
    }
    for tag in KNOWN_DISEASE_TAGS:
        meta[f"disease_{tag}"] = tag in tags_present
    return meta


class EmbeddingBackend:
    """Pluggable so this script's chunking/Chroma-loading logic can be
    verified without downloading/running the real model."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError


class NomicEmbeddingBackend(EmbeddingBackend):
    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME, device: Optional[str] = None):
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model %s (first run downloads ~550MB)...", model_name)
        self.model = SentenceTransformer(model_name, trust_remote_code=True, device=device)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        prefixed = [DOCUMENT_PREFIX + t for t in texts]
        embeddings = self.model.encode(prefixed, show_progress_bar=True, batch_size=16)
        return embeddings.tolist()


class DummyEmbeddingBackend(EmbeddingBackend):
    """Deterministic, zero-cost, no model download -- for verifying the
    chunking/metadata/Chroma-loading wiring without real inference."""

    def __init__(self, dim: int = 8):
        self.dim = dim

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        import hashlib

        out = []
        for t in texts:
            h = hashlib.sha256(t.encode("utf-8")).digest()
            vec = [b / 255.0 for b in h[: self.dim]]
            out.append(vec)
        return out


def build_backend(name: str) -> EmbeddingBackend:
    if name == "nomic":
        return NomicEmbeddingBackend()
    elif name == "dummy":
        logger.warning("Using DummyEmbeddingBackend -- vectors are placeholders, for wiring checks only.")
        return DummyEmbeddingBackend()
    raise ValueError(f"Unknown backend: {name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("chunks_jsonl")
    ap.add_argument("--persist-dir", default="chroma_db")
    ap.add_argument("--collection", default="derma_handbook")
    ap.add_argument("--backend", choices=["nomic", "dummy"], default="nomic")
    ap.add_argument("--batch-size", type=int, default=64)
    args = ap.parse_args()

    import chromadb

    chunks = [json.loads(l) for l in Path(args.chunks_jsonl).read_text(encoding="utf-8").splitlines() if l.strip()]
    logger.info("Loaded %d chunks", len(chunks))

    kept, dropped = clean_chunks(chunks)
    logger.info("After cleaning: kept %d, dropped %d low-value chunks", len(kept), len(dropped))

    backend = build_backend(args.backend)

    client = chromadb.PersistentClient(path=args.persist_dir)
    # Recreate the collection each run so re-running this script after
    # re-chunking doesn't leave stale vectors behind.
    try:
        client.delete_collection(args.collection)
    except Exception:
        pass
    collection = client.create_collection(args.collection, metadata={"hnsw:space": "cosine"})

    for i in range(0, len(kept), args.batch_size):
        batch = kept[i : i + args.batch_size]
        texts = [c["embedding_text"] for c in batch]
        ids = [c["chunk_id"] for c in batch]
        metadatas = [flatten_metadata(c) for c in batch]
        embeddings = backend.embed_documents(texts)
        collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        logger.info("Embedded and loaded batch %d-%d / %d", i, i + len(batch), len(kept))

    logger.info("Done. Collection %r at %s has %d vectors.", args.collection, args.persist_dir, collection.count())


if __name__ == "__main__":
    main()
