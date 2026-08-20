"""
parse_pdf.py
============
Parsing stage for the dermatology RAG pipeline, built on unstructured.io.

WHY THIS DOCUMENT NEEDS `hi_res` (not `fast`/pdfminer-only):
--------------------------------------------------------------
This booklet (WHO "Integrated approach to management of skin-related NTDs
and common skin conditions") is an InDesign export with very heavy vector
graphics on almost every page (diagnostic flowcharts, colour-coded
ASK/LOOK/FEEL grids, anatomical diagrams). Empirically, on this exact file:

    Page 1 has 201729 graphics ops, 36 text ops (ratio: 5603.6).
    Exceeds thresholds (ops: 10000, ratio: 20.0).
    Flagging PDF as too complex for text extraction.
    Falling back to hi_res strategy without text extraction.

unstructured's own `is_pdf_too_complex()` heuristic detects this and
silently forces `hi_res` regardless of the `strategy=` you pass, because
`pdf_text_extractable` ends up False. So there is no point requesting
"fast" for this file -- budget for hi_res (layout-model based) from the
start: it is slower and needs the YOLOX/detectron2 layout model (pulled
from Hugging Face on first run -- make sure that host is reachable, or
pre-download/cache the model in your deployment image), but it is the
only strategy that will give you correct reading order and table
detection on this document.

If hi_res / its model download is ever unavailable, `ocr_only` (tesseract,
fully offline, no model download) is the fallback used here -- it degrades
gracefully (some OCR noise, occasional misreads like "(" -> "C") but keeps
the pipeline running end-to-end.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Optional

from unstructured.partition.pdf import partition_pdf
from unstructured.documents.elements import Element

logger = logging.getLogger(__name__)


@dataclass
class ParsedElement:
    """A flattened, JSON-serializable view of an unstructured Element."""

    element_id: str
    category: str  # Title, NarrativeText, ListItem, Table, Image, Text, ...
    text: str
    page_number: Optional[int] = None
    filename: Optional[str] = None
    table_html: Optional[str] = None  # populated when category == "Table"
    coordinates: Optional[dict] = None
    extra_metadata: dict[str, Any] = field(default_factory=dict)


def _element_to_parsed(el: Element, source_filename: str) -> ParsedElement:
    meta = el.metadata.to_dict() if el.metadata else {}
    coords = meta.get("coordinates")
    # Some element types (notably bare Image/Figure elements with no OCR'd
    # text under hi_res) have __str__ return None instead of "". Confirmed
    # on a real hi_res run of the full WHO handbook: str(el) itself raises
    # "TypeError: __str__ returned non-string (type NoneType)" at the
    # Python level (not something an `is not None` check can catch, since
    # the TypeError happens inside str() before it returns anything).
    try:
        raw_text = str(el)
    except TypeError:
        raw_text = None
    text = raw_text.strip() if raw_text else ""
    return ParsedElement(
        element_id=str(getattr(el, "id", "") or ""),
        category=type(el).__name__,
        text=text,
        page_number=meta.get("page_number"),
        filename=source_filename,
        table_html=meta.get("text_as_html"),
        coordinates=coords,
        extra_metadata={
            k: v
            for k, v in meta.items()
            if k not in {"coordinates", "page_number", "text_as_html"}
        },
    )


def parse_pdf(
    pdf_path: str | Path,
    strategy: str = "hi_res",
    infer_table_structure: bool = True,
    extract_images: bool = True,
    image_output_dir: Optional[str | Path] = None,
    languages: Optional[list[str]] = None,
    starting_page_number: int = 1,
    fallback_strategy: str = "ocr_only",
) -> list[ParsedElement]:
    """
    Partition a PDF with unstructured.io.

    Parameters
    ----------
    pdf_path : path to the source PDF.
    strategy : "hi_res" is strongly recommended for this document (see module
        docstring). "fast" will silently be upgraded to hi_res by unstructured
        anyway once it detects the graphics-heavy pages.
    infer_table_structure : ask the hi_res layout model to detect tables and
        return them as HTML (`text_as_html` in metadata). Needed to capture
        the disease-comparison tables intact rather than as scrambled text.
    extract_images : save cropped images of figures/photos to `image_output_dir`
        so they can be captioned and linked back to their section later
        (see recommendations in the accompanying README).
    fallback_strategy : used automatically if hi_res fails (e.g. no network
        access to download the layout model). Keeps the pipeline runnable
        offline, at the cost of noisier OCR text and no table structure.
    """
    pdf_path = Path(pdf_path)
    languages = languages or ["eng"]

    kwargs: dict[str, Any] = dict(
        filename=str(pdf_path),
        strategy=strategy,
        infer_table_structure=infer_table_structure,
        languages=languages,
        starting_page_number=starting_page_number,
    )
    if extract_images:
        kwargs["extract_image_block_types"] = ["Image", "Table"]
        if image_output_dir:
            Path(image_output_dir).mkdir(parents=True, exist_ok=True)
            kwargs["extract_image_block_output_dir"] = str(image_output_dir)

    try:
        elements = partition_pdf(**kwargs)
    except Exception as e:  # noqa: BLE001 - deliberately broad, see docstring
        logger.warning(
            "strategy=%r failed (%s). Retrying with fallback_strategy=%r. "
            "This is expected in network-restricted environments where the "
            "hi_res layout model can't be downloaded from Hugging Face.",
            strategy,
            e,
            fallback_strategy,
        )
        kwargs["strategy"] = fallback_strategy
        # ocr_only doesn't support table-structure inference the same way
        kwargs.pop("infer_table_structure", None)
        elements = partition_pdf(**kwargs)

    return [_element_to_parsed(el, pdf_path.name) for el in elements]


def save_parsed_elements(elements: list[ParsedElement], out_path: str | Path) -> None:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        for el in elements:
            f.write(json.dumps(asdict(el), ensure_ascii=False) + "\n")
    logger.info("Wrote %d parsed elements to %s", len(elements), out_path)


def load_parsed_elements(path: str | Path) -> list[ParsedElement]:
    path = Path(path)
    out = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            if line.strip():
                out.append(ParsedElement(**json.loads(line)))
    return out


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO)
    ap = argparse.ArgumentParser(description="Parse a PDF with unstructured.io")
    ap.add_argument("pdf_path")
    ap.add_argument("--out", default="parsed_elements.jsonl")
    ap.add_argument("--strategy", default="hi_res")
    ap.add_argument("--images-dir", default="extracted_images")
    args = ap.parse_args()

    els = parse_pdf(
        args.pdf_path,
        strategy=args.strategy,
        image_output_dir=args.images_dir,
    )
    save_parsed_elements(els, args.out)
