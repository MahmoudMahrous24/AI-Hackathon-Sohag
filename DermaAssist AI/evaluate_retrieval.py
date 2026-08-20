"""
evaluate_retrieval.py
======================
Measures embedding-model retrieval quality against the Chroma collection
built by build_vector_store.py, with two query sets and three metrics.

WHY TWO QUERY SETS
--------------------
The first round of this eval (NAMED_QUERIES: "How is cutaneous
leishmaniasis diagnosed?") came back at a perfect Precision@5 = 1.00 on
the real nomic-embed-text-v1.5 collection. That result is real, but it's
not proof the embedding model is doing anything a keyword search couldn't
do just as well -- every one of those queries contains the disease name
verbatim, and disease_tags (the relevance ground truth) is itself computed
from keyword matching in section_chunker.py. A keyword search would very
plausibly also score 1.00 on those.

SYMPTOM_ONLY_QUERIES is the actual test of embedding quality: each one
describes a real clinical presentation from this document, in different
words than the document uses, with the disease name never mentioned. This
is where semantic similarity either earns its keep over keyword matching
or doesn't. Ground truth for each was checked against the specific page/
algorithm branch it paraphrases (noted in each TestQuery's `source_note`)
-- these aren't generic textbook symptom lists, they're paraphrases of
what THIS document actually says, so a good score here reflects the
embedding model correctly connecting a differently-worded description to
this book's specific content, not general medical knowledge overlap.

METRICS
---------
- Precision@k: of the k retrieved chunks, what fraction are tagged with
  the target disease. Measures result purity -- how much of what you get
  back is on-topic.
- Recall@k: of ALL chunks in the collection tagged with the target
  disease, what fraction appear in the top k. Measures coverage -- since
  k=5 is much smaller than most diseases' total tagged-chunk count, this
  will typically be well under 1.0 even for a good retriever; it's most
  useful compared across queries/models, not read as an absolute score.
- MRR (Mean Reciprocal Rank) = 1/rank of the FIRST relevant result (0 if
  none in top k). Precision@5 can't tell you whether the one relevant hit
  in a mixed result set was ranked #1 or #5 -- MRR can. This is often the
  more decision-relevant number for a chatbot, since the top-ranked chunk
  usually dominates what the generation step answers with.

Same relevance-proxy caveat as before applies to both query sets:
disease_tags is a keyword-based proxy for relevance, not a hand-labeled
gold set, so treat these as directionally meaningful, not exact.

COSINE SIMILARITY
-------------------
Reported as 1 - Chroma's cosine distance (collection uses
hnsw:space: cosine), matching common embedding-model documentation
convention.

Usage:
    python evaluate_retrieval.py --persist-dir rag_build/chroma_db --show-text
    python evaluate_retrieval.py --persist-dir rag_build/chroma_db --set symptom_only
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass


@dataclass
class TestQuery:
    query: str
    target_disease_tag: str
    category: str
    source_note: str = ""


NAMED_QUERIES: list[TestQuery] = [
    TestQuery("What does a leprosy skin lesion look like?", "leprosy", "named"),
    TestQuery("How is cutaneous leishmaniasis diagnosed?", "leishmaniasis", "named"),
    TestQuery("Symptoms of scabies and how it is treated", "scabies", "named"),
    TestQuery("Signs of swelling from lymphatic filariasis", "lymphatic_filariasis", "named"),
    TestQuery("How to treat mycetoma or chromoblastomycosis", "deep_mycoses", "named"),
]

# Disease name never appears in the query text. Each paraphrases a
# specific branch of this document (see source_note) in different words.
SYMPTOM_ONLY_QUERIES: list[TestQuery] = [
    TestQuery(
        "Patient has pale patches on the skin with reduced sensation, and a "
        "thickened nerve that can be felt near the elbow",
        "leprosy",
        "symptom_only",
        source_note="Chapter 1 Patches algorithm: hypopigmented patch(es) -> reduced "
        "sensation on patch(es) -> peripheral nerve enlargement -> Leprosy",
    ),
    TestQuery(
        "A sore on the face started as a small bump and slowly grew into an "
        "ulcer with raised edges that has not healed for several weeks",
        "leishmaniasis",
        "symptom_only",
        source_note="Chapter 1 Skin ulcers algorithm: face and neck lesions, chronic, "
        "no/limited pain -> Cutaneous leishmaniasis; and section 2.2.3.1 lesion evolution",
    ),
    TestQuery(
        "Severe itching that gets much worse at night, with small burrow-like "
        "lines between the fingers, and other family members have the same problem",
        "scabies",
        "symptom_only",
        source_note="Chapter 1 Lumps algorithm: itch, acute, finger webspace and "
        "genitals, night itch, family history with itch -> Scabies",
    ),
    TestQuery(
        "One leg has become swollen and thick over several months, the skin "
        "does not pit when pressed, with past episodes of fever and leg pain",
        "lymphatic_filariasis",
        "symptom_only",
        source_note="Chapter 1 Swelling algorithm: chronic, limb usually one side, "
        "non-pitting edema, history of recurrent leg pain -> Lymphatic filariasis",
    ),
    TestQuery(
        "A farmer has a slowly growing swelling on the foot with several "
        "discharging channels containing small grain-like particles, after "
        "years of walking barefoot",
        "deep_mycoses",
        "symptom_only",
        source_note="Chapter 1 Swelling algorithm: localized limb swelling, multiple "
        "pus discharging sinuses with 'grains', woody swelling, walking barefoot -> Mycetoma",
    ),
]

QUERY_PREFIX = "search_query: "


def get_total_relevant(collection, tag: str) -> int:
    # Filters on the per-tag boolean field (disease_<tag>) written by
    # build_vector_store.py -- NOT disease_tags with $contains, which
    # silently returns 0 results: Chroma's $contains operator only works
    # inside where_document (full-text search), not for metadata field
    # substring matching. Confirmed by direct testing against a real
    # collection with known disease_tags="scabies" chunks present.
    result = collection.get(where={f"disease_{tag}": True}, include=[])
    return len(result["ids"])


def run_eval(collection, queries: list[TestQuery], embed_fn, k: int, show_text: bool):
    precisions, recalls, mrrs, all_sims = [], [], [], []

    for tq in queries:
        query_embedding = embed_fn(tq.query)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )
        docs = results["documents"][0]
        metas = results["metadatas"][0]
        sims = [1 - d for d in results["distances"][0]]
        relevant_flags = [tq.target_disease_tag in (m.get("disease_tags") or "").split(",") for m in metas]

        total_relevant = get_total_relevant(collection, tq.target_disease_tag)
        precision = sum(relevant_flags) / len(relevant_flags) if relevant_flags else 0.0
        recall = sum(relevant_flags) / total_relevant if total_relevant else 0.0
        rank_of_first = next((i + 1 for i, r in enumerate(relevant_flags) if r), None)
        mrr = 1.0 / rank_of_first if rank_of_first else 0.0

        precisions.append(precision)
        recalls.append(recall)
        mrrs.append(mrr)
        all_sims.extend(sims)

        print(f"Query: {tq.query!r}")
        if tq.source_note:
            print(f"  (paraphrases: {tq.source_note})")
        print(f"  target tag: {tq.target_disease_tag}  |  total tagged chunks in collection: {total_relevant}")
        print(f"  Precision@{k}: {precision:.2f}   Recall@{k}: {recall:.2f}   MRR: {mrr:.2f}")
        print(f"  Cosine similarity -- mean: {sum(sims)/len(sims):.3f}, min: {min(sims):.3f}, max: {max(sims):.3f}")
        for i, (doc, meta, sim, rel) in enumerate(zip(docs, metas, sims, relevant_flags)):
            mark = "[relevant]" if rel else "[  --   ]"
            print(f"    {i+1}. {mark} sim={sim:.3f} | {meta['content_type']:16} | p{meta['page_start']}-{meta['page_end']} | tags={meta.get('disease_tags')}")
            if show_text:
                print(f"       {doc[:150]}")
        print()

    n = len(queries)
    print(f"  -- category summary ({n} queries) --")
    print(f"  Mean Precision@{k}: {sum(precisions)/n:.3f}")
    print(f"  Mean Recall@{k}:    {sum(recalls)/n:.3f}")
    print(f"  Mean MRR:           {sum(mrrs)/n:.3f}")
    print(f"  Mean cosine sim:    {sum(all_sims)/len(all_sims):.3f}")
    print()
    return precisions, recalls, mrrs, all_sims


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--persist-dir", default="chroma_db")
    ap.add_argument("--collection", default="derma_handbook")
    ap.add_argument("--k", type=int, default=5)
    ap.add_argument("--backend", choices=["nomic", "dummy"], default="nomic")
    ap.add_argument("--set", choices=["named", "symptom_only", "both"], default="both")
    ap.add_argument("--show-text", action="store_true")
    args = ap.parse_args()

    import chromadb

    if args.backend == "nomic":
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("nomic-ai/nomic-embed-text-v1.5", trust_remote_code=True)

        def embed(text: str) -> list[float]:
            return model.encode([QUERY_PREFIX + text]).tolist()[0]
    else:
        print("WARNING: --backend dummy uses placeholder hash-based vectors. All metrics "
              "below are meaningless except to confirm the script runs end-to-end. Use "
              "--backend nomic for a real measurement.\n")
        import hashlib

        def embed(text: str) -> list[float]:
            h = hashlib.sha256(text.encode("utf-8")).digest()
            return [b / 255.0 for b in h[:8]]

    client = chromadb.PersistentClient(path=args.persist_dir)
    collection = client.get_collection(args.collection)
    print(f"Collection has {collection.count()} vectors.\n")

    results_by_category = {}

    if args.set in ("named", "both"):
        print("=" * 70)
        print("NAMED QUERIES (disease named explicitly -- tests baseline retrieval)")
        print("=" * 70)
        results_by_category["named"] = run_eval(collection, NAMED_QUERIES, embed, args.k, args.show_text)

    if args.set in ("symptom_only", "both"):
        print("=" * 70)
        print("SYMPTOM-ONLY QUERIES (disease never named -- tests real semantic retrieval)")
        print("=" * 70)
        results_by_category["symptom_only"] = run_eval(collection, SYMPTOM_ONLY_QUERIES, embed, args.k, args.show_text)

    if len(results_by_category) == 2:
        print("=" * 70)
        print("COMPARISON")
        print("=" * 70)
        for metric_idx, metric_name in enumerate(["Precision", "Recall", "MRR"]):
            named_mean = sum(results_by_category["named"][metric_idx]) / len(results_by_category["named"][metric_idx])
            hard_mean = sum(results_by_category["symptom_only"][metric_idx]) / len(results_by_category["symptom_only"][metric_idx])
            gap = named_mean - hard_mean
            print(f"  {metric_name}@{args.k}: named={named_mean:.3f}  symptom_only={hard_mean:.3f}  gap={gap:+.3f}")
        print()
        print("  A small gap means the model is finding the right content from symptom")
        print("  descriptions nearly as well as from disease names -- that's the sign of")
        print("  real semantic retrieval. A large gap means it's substantially leaning on")
        print("  keyword/name overlap, and symptom-only queries from real patients may")
        print("  retrieve poorly in production even though named-disease queries look great.")


if __name__ == "__main__":
    main()
