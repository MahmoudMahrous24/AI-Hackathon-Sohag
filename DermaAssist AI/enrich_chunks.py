"""
enrich_chunks.py
=================
Post-processes chunks.jsonl (from pipeline.py) by replacing the raw
text/OCR content of `diagnostic_algorithm` chunks, and augmenting
`figure_caption` chunks, with vision-model-generated descriptions.

Uses a FREE, LOCAL vision model via Ollama by default -- no API cost.
See vision_caption.py's module docstring for one-time Ollama setup
(install + `ollama pull llava:13b`).

Adds two fields to each affected chunk:
  - raw_text: the original extracted text, kept for audit/debugging
  - embedding_text: the text you should actually embed and index --
    vision_description for diagnostic_algorithm and figure_caption chunks,
    same as `text` for everything else.

Caches one page render + one model call per PDF page (a diagnostic page and
its neighboring figure captions on the same page share a render), so this
document's confirmed 4 flowchart regions (pages 24-35, 43, 55, 136 -- see
find_algorithm_pages.py) cost 15 model calls total, not one per chunk.

Usage:
    # 1. Install Ollama (https://ollama.com) and pull a model:
    ollama pull llava:13b
    # 2. Run:
    python enrich_chunks.py rag_build/chunks.jsonl your_book.pdf \
        --out rag_build/chunks_enriched.jsonl \
        --algorithm-pages "24-35,43-43,55-55,136-136"

    # Dry run without waiting on the model, to check wiring:
    python enrich_chunks.py rag_build/chunks.jsonl your_book.pdf --backend null
"""

from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path

from vision_caption import (
    NullCaptioner,
    OllamaCaptioner,
    AnthropicCaptioner,
    caption_diagnostic_algorithm_page,
    caption_clinical_photo,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def breadcrumb_from_path(section_path: dict) -> str:
    parts = []
    if section_path.get("chapter_number"):
        parts.append(f"Chapter {section_path['chapter_number']}: {section_path.get('chapter_title', '')}")
    if section_path.get("annexure_number"):
        parts.append(f"Annexure {section_path['annexure_number']}: {section_path.get('annexure_title', '')}")
    if section_path.get("box_title"):
        parts.append(f"Box: {section_path['box_title']}")
    if section_path.get("section_number"):
        parts.append(f"{section_path['section_number']} {section_path.get('section_title', '')}")
    if section_path.get("subsection_number"):
        parts.append(f"{section_path['subsection_number']} {section_path.get('subsection_title', '')}")
    return " > ".join(p for p in parts if p.strip())


def build_captioner(args):
    if args.backend == "ollama":
        return OllamaCaptioner(model=args.ollama_model, host=args.ollama_host)
    elif args.backend == "anthropic":
        logger.warning(
            "Using the paid Anthropic API backend (--backend anthropic). "
            "Needs ANTHROPIC_API_KEY set. The default 'ollama' backend is free."
        )
        return AnthropicCaptioner()
    elif args.backend == "null":
        logger.warning("Using NullCaptioner -- output will be placeholder text, for wiring checks only.")
        return NullCaptioner()
    raise ValueError(f"Unknown backend: {args.backend}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("chunks_jsonl")
    ap.add_argument("pdf_path")
    ap.add_argument("--out", default="chunks_enriched.jsonl")
    ap.add_argument("--backend", choices=["ollama", "anthropic", "null"], default="ollama")
    ap.add_argument("--ollama-model", default="llava:13b")
    ap.add_argument("--ollama-host", default="http://localhost:11434")
    ap.add_argument("--sleep-between-calls", type=float, default=0.2)
    ap.add_argument(
        "--skip-photos",
        action="store_true",
        help="Only caption diagnostic_algorithm pages, skip figure_caption photo captioning "
        "(faster first pass -- the algorithm pages are the safety-critical ones)",
    )
    args = ap.parse_args()

    captioner = build_captioner(args)

    chunks = [json.loads(l) for l in Path(args.chunks_jsonl).read_text().splitlines() if l.strip()]
    logger.info("Loaded %d chunks", len(chunks))

    # Cache diagnostic-algorithm captions per page (a page may have been split
    # into several elements/chunks upstream; caption it once).
    algo_page_cache: dict[int, str] = {}

    n_captioned_algo = 0
    n_captioned_photo = 0
    n_errors = 0

    for chunk in chunks:
        breadcrumb = breadcrumb_from_path(chunk["section_path"])
        disease_tags = chunk.get("disease_tags", [])
        chunk["raw_text"] = chunk["text"]
        chunk["embedding_text"] = chunk["text"]  # default: unchanged

        if chunk["content_type"] == "diagnostic_algorithm":
            page = chunk.get("page_start")
            if page is None:
                continue
            if page in algo_page_cache:
                chunk["vision_description"] = algo_page_cache[page]
                chunk["embedding_text"] = algo_page_cache[page]
                continue
            try:
                desc = caption_diagnostic_algorithm_page(
                    captioner, args.pdf_path, page, breadcrumb, disease_tags
                )
                algo_page_cache[page] = desc
                chunk["vision_description"] = desc
                chunk["embedding_text"] = desc
                n_captioned_algo += 1
                logger.info("Captioned diagnostic_algorithm page %s (%s)", page, breadcrumb)
                time.sleep(args.sleep_between_calls)
            except Exception as e:  # noqa: BLE001
                logger.error("Failed to caption page %s: %s", page, e)
                chunk["vision_description"] = None
                n_errors += 1

        elif chunk["content_type"] == "figure_caption" and not args.skip_photos:
            page = chunk.get("page_start")
            if page is None:
                continue
            try:
                desc = caption_clinical_photo(
                    captioner,
                    pdf_path=args.pdf_path,
                    page_number=page,
                    caption_text=chunk["text"],
                    breadcrumb=breadcrumb,
                    disease_tags=disease_tags,
                )
                chunk["vision_description"] = desc
                chunk["embedding_text"] = f"{chunk['text']}\n\n{desc}"
                n_captioned_photo += 1
                logger.info("Captioned figure_caption page %s (%s)", page, breadcrumb)
                time.sleep(args.sleep_between_calls)
            except Exception as e:  # noqa: BLE001
                logger.error("Failed to caption figure on page %s: %s", page, e)
                chunk["vision_description"] = None
                n_errors += 1

    with open(args.out, "w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")

    logger.info(
        "Done. %d diagnostic-algorithm pages captioned, %d figure photos captioned, "
        "%d errors. Wrote %s",
        n_captioned_algo, n_captioned_photo, n_errors, args.out,
    )


if __name__ == "__main__":
    main()
