"""
clean_chunks.py
================
Filters low-value chunks out of chunks_enriched.jsonl before embedding.

Found by inspecting the real output: 63 of 370 chunks (17%) were page
furniture, not content -- three patterns, all confirmed against the
actual data:

1. Bare page-footer numbers picked up as standalone narrative elements
   by hi_res OCR (e.g. '40', '48', '107', even OCR artifacts like
   '108\\n\\n|').
2. Running headers repeated on nearly every page (e.g. "Chapter 2: Major
   skin-related neglected tropical diseases in the South-East Asia
   Region") that got extracted as their own element, disconnected from
   any body content, whenever nothing else landed in the same chunk.
   Without filtering, this exact header repeats as ~8 separate
   near-identical junk vectors in the vector store -- exactly the kind
   of duplicate-vector pollution that hurts retrieval ranking.
3. Bare section headings with nothing merged under them (e.g.
   '2.1. Leprosy' on its own), and bare figure numbers with no caption
   text ('Figure 2.6.1.' alone -- happens on the Chapter 3 photo-gallery
   pages where a figure number sits under a thumbnail with the
   description elsewhere on the page).

None of these carry retrievable content on their own -- the section
context they'd provide is already present in every real chunk's
section_path metadata, so nothing is lost by dropping them.

Sanity-checked against false positives: real short chunks like
"Figure 3.5.1. Acne" (has an actual disease name after the number) and
"Table 1. Leprosy reactions" (a real table caption) are correctly kept.
"""

from __future__ import annotations

import re

_NUMERIC_OR_ARTIFACT_RE = re.compile(r"[\d\s|]+")
_BARE_HEADING_RE = re.compile(
    r"(Chapter\s+\d+\s*:\s*.+|Annexure\s+\d+\s*:\s*.+|Box\s*:\s*.+|\d+(\.\d+){1,3}\.?\s+.{2,120})",
    re.IGNORECASE,
)
_BARE_FIGURE_NUMBER_RE = re.compile(r"Figure\s+\d+(\.\d+){1,3}\.\s*", re.IGNORECASE)


def is_low_value_chunk(text: str) -> bool:
    """True if `text` is page furniture with no retrievable content of its own."""
    t = text.strip()
    if not t:
        return True
    if _NUMERIC_OR_ARTIFACT_RE.fullmatch(t):
        return True
    if _BARE_HEADING_RE.fullmatch(t):
        return True
    if _BARE_FIGURE_NUMBER_RE.fullmatch(t):
        return True
    return False


def clean_chunks(chunks: list[dict]) -> tuple[list[dict], list[dict]]:
    """Returns (kept, dropped)."""
    kept, dropped = [], []
    for c in chunks:
        if is_low_value_chunk(c.get("embedding_text", c.get("text", ""))):
            dropped.append(c)
        else:
            kept.append(c)
    return kept, dropped


if __name__ == "__main__":
    import argparse
    import json
    from pathlib import Path

    ap = argparse.ArgumentParser()
    ap.add_argument("chunks_jsonl")
    ap.add_argument("--out", default="chunks_clean.jsonl")
    args = ap.parse_args()

    chunks = [json.loads(l) for l in Path(args.chunks_jsonl).read_text(encoding="utf-8").splitlines() if l.strip()]
    kept, dropped = clean_chunks(chunks)

    with open(args.out, "w", encoding="utf-8") as f:
        for c in kept:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    print(f"Loaded {len(chunks)} chunks. Kept {len(kept)}, dropped {len(dropped)} as low-value.")
    print("Dropped examples:")
    for c in dropped[:10]:
        print(f"  {c['content_type']:16} page {c.get('page_start')}: {c['embedding_text'][:50]!r}")
