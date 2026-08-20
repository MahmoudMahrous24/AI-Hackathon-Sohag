"""
pipeline.py
===========
End-to-end: PDF -> unstructured.io parse -> section-aware chunk -> JSONL,
ready to embed and load into a vector store for the dermatology RAG assistant.

Usage:
    python pipeline.py path/to/who_skin_ntd_handbook.pdf \
        --out-dir ./rag_build \
        --algorithm-pages "1-24,43-43,55-55,61-61"

`--algorithm-pages` should list the page ranges (1-indexed, PDF page numbers)
you've identified as flowchart / ASK-LOOK-FEEL grid / decision-tree pages.
For THIS specific WHO booklet, based on manual review of the document:
  - All of Chapter 1 (physical pages ~13-24) is ASK/LOOK/FEEL diagnostic
    grids for presenting symptoms (ulcers, swelling, plaques, blisters, ...).
  - Each disease's "Flow chart for diagnosing ..." figure page in Chapter 2
    (e.g. Figure 2.1.8 for leprosy, Figure 2.2.7 for leishmaniasis, etc.)
Re-verify exact page numbers against your own copy/edition before running
at full scale -- pagination can shift between print runs.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

from parse_pdf import parse_pdf, save_parsed_elements
from section_chunker import build_section_chunks

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main():
    ap = argparse.ArgumentParser(description="Full parse+chunk pipeline")
    ap.add_argument("pdf_path")
    ap.add_argument("--out-dir", default="rag_build")
    ap.add_argument("--strategy", default="hi_res")
    ap.add_argument("--fallback-strategy", default="ocr_only")
    ap.add_argument("--algorithm-pages", default="")
    ap.add_argument("--max-chunk-chars", type=int, default=1800)
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Parsing %s with unstructured.io (strategy=%s)...", args.pdf_path, args.strategy)
    elements = parse_pdf(
        args.pdf_path,
        strategy=args.strategy,
        fallback_strategy=args.fallback_strategy,
        image_output_dir=out_dir / "images",
    )
    save_parsed_elements(elements, out_dir / "parsed_elements.jsonl")

    ranges = []
    if args.algorithm_pages.strip():
        for part in args.algorithm_pages.split(","):
            lo, hi = part.split("-")
            ranges.append((int(lo), int(hi)))

    logger.info("Building section-aware chunks (%d algorithm-page ranges flagged)...", len(ranges))
    chunks = build_section_chunks(
        elements,
        algorithm_page_ranges=ranges,
        max_chars=args.max_chunk_chars,
    )

    chunks_path = out_dir / "chunks.jsonl"
    with chunks_path.open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c.to_dict(), ensure_ascii=False) + "\n")

    from collections import Counter

    type_counts = Counter(c.content_type for c in chunks)
    logger.info("Done. %d chunks written to %s", len(chunks), chunks_path)
    logger.info("Breakdown by content_type: %s", dict(type_counts))
    logger.info(
        "NOTE: %d chunks are tagged 'diagnostic_algorithm' -- these should be "
        "regenerated via vision-model captioning before embedding, not embedded "
        "as raw OCR/text-extraction text. See README.md.",
        type_counts.get("diagnostic_algorithm", 0),
    )


if __name__ == "__main__":
    main()
