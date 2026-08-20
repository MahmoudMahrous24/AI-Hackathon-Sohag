"""
eval_models.py
==============
Multi-model Precision@k and Recall@k comparison benchmark for Day 2.
Evaluates both nomic-embed-text-v1.5 and all-MiniLM-L6-v2 against clinical queries.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer

from clean_chunks import clean_chunks
from build_vector_store import flatten_metadata

@dataclass
class EvalQuery:
    query: str
    target_tag: str
    category: str
    source_note: str = ""

TEST_QUERIES: list[EvalQuery] = [
    # Named queries (Baseline)
    EvalQuery("What does a leprosy skin lesion look like?", "leprosy", "named"),
    EvalQuery("How is cutaneous leishmaniasis diagnosed?", "leishmaniasis", "named"),
    EvalQuery("Symptoms of scabies and how it is treated", "scabies", "named"),
    EvalQuery("Signs of swelling from lymphatic filariasis", "lymphatic_filariasis", "named"),
    EvalQuery("How to treat mycetoma or chromoblastomycosis", "deep_mycoses", "named"),

    # Symptom-only queries (True semantic test)
    EvalQuery(
        "Patient has pale patches on the skin with reduced sensation, and a thickened nerve near the elbow",
        "leprosy",
        "symptom_only",
        source_note="Chapter 1 Patches algorithm",
    ),
    EvalQuery(
        "A sore on the face started as a small bump and slowly grew into an ulcer with raised edges",
        "leishmaniasis",
        "symptom_only",
        source_note="Chapter 1 Skin ulcers algorithm",
    ),
    EvalQuery(
        "Severe itching that gets much worse at night with small lines between fingers",
        "scabies",
        "symptom_only",
        source_note="Chapter 1 Lumps algorithm",
    ),
    EvalQuery(
        "One leg has become swollen and thick over several months with non-pitting edema",
        "lymphatic_filariasis",
        "symptom_only",
        source_note="Chapter 1 Swelling algorithm",
    ),
    EvalQuery(
        "A farmer has swelling on the foot with discharging sinuses containing small grains",
        "deep_mycoses",
        "symptom_only",
        source_note="Chapter 1 Swelling algorithm",
    ),
]

MODELS = {
    "nomic-embed-text-v1.5": {
        "model_name": "nomic-ai/nomic-embed-text-v1.5",
        "doc_prefix": "search_document: ",
        "query_prefix": "search_query: ",
        "trust_remote_code": True,
        "context_window": 8192,
    },
    "all-MiniLM-L6-v2": {
        "model_name": "sentence-transformers/all-MiniLM-L6-v2",
        "doc_prefix": "",
        "query_prefix": "",
        "trust_remote_code": False,
        "context_window": 256,
    },
}

CHUNKS_PATH = "rag_build/chunks_enriched.jsonl"
K = 5


def run_benchmark():
    raw_chunks = [
        json.loads(line)
        for line in Path(CHUNKS_PATH).read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    kept_chunks, _ = clean_chunks(raw_chunks)

    print(f"Loaded {len(kept_chunks)} clean chunks for evaluation.")
    print(f"{'='*70}\nSTARTING DAY 2 EMBEDDING MODEL BENCHMARK (k={K})\n{'='*70}")

    overall_results = {}

    for model_key, cfg in MODELS.items():
        print(f"\n[1/3] Loading Model: {model_key}...")
        model = SentenceTransformer(
            cfg["model_name"], trust_remote_code=cfg["trust_remote_code"]
        )

        client = chromadb.EphemeralClient()
        collection = client.create_collection(
            name=f"eval_{model_key.replace('-', '_').replace('.', '_')}",
            metadata={"hnsw:space": "cosine"},
        )

        print(f"[2/3] Embedding {len(kept_chunks)} chunks for {model_key}...")
        batch_size = 64
        for i in range(0, len(kept_chunks), batch_size):
            batch = kept_chunks[i : i + batch_size]
            texts = [c["embedding_text"] for c in batch]
            ids = [c["chunk_id"] for c in batch]
            metadatas = [flatten_metadata(c) for c in batch]

            prefixed_docs = [cfg["doc_prefix"] + t for t in texts]
            embeddings = model.encode(prefixed_docs, show_progress_bar=False).tolist()

            collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )

        print(f"[3/3] Evaluating {len(TEST_QUERIES)} test queries...")
        precisions_named, precisions_symptom = [], []
        recalls_named, recalls_symptom = [], []
        per_query_report = []

        for item in TEST_QUERIES:
            query_text = f"{cfg['query_prefix']}{item.query}"
            query_vector = model.encode([query_text]).tolist()

            results = collection.query(
                query_embeddings=query_vector,
                n_results=K,
                include=["documents", "metadatas", "distances"],
            )

            metas = results["metadatas"][0]
            dists = results["distances"][0]

            # Check relevance by disease tag match
            relevant_flags = [
                item.target_tag in (m.get("disease_tags") or "").split(",")
                for m in metas
            ]

            # Total relevant in collection for recall
            total_relevant_count = len(
                collection.get(where={f"disease_{item.target_tag}": True})["ids"]
            )

            precision_at_k = sum(relevant_flags) / K
            recall_at_k = (
                sum(relevant_flags) / total_relevant_count
                if total_relevant_count > 0
                else 0.0
            )

            if item.category == "named":
                precisions_named.append(precision_at_k)
                recalls_named.append(recall_at_k)
            else:
                precisions_symptom.append(precision_at_k)
                recalls_symptom.append(recall_at_k)

            per_query_report.append({
                "query": item.query,
                "category": item.category,
                "target_tag": item.target_tag,
                "precision_at_k": round(precision_at_k, 3),
                "recall_at_k": round(recall_at_k, 3),
                "top_distance": round(dists[0], 3) if dists else None,
            })

        named_p = sum(precisions_named) / len(precisions_named)
        symptom_p = sum(precisions_symptom) / len(precisions_symptom)
        overall_p = (sum(precisions_named) + sum(precisions_symptom)) / len(TEST_QUERIES)

        overall_results[model_key] = {
            "context_window_tokens": cfg["context_window"],
            "named_precision_at_5": round(named_p, 3),
            "symptom_precision_at_5": round(symptom_p, 3),
            "overall_precision_at_5": round(overall_p, 3),
            "queries_evaluated": len(TEST_QUERIES),
            "details": per_query_report,
        }

        print(
            f"--> {model_key} | Overall P@{K}: {overall_p:.3f} | Named P@{K}: {named_p:.3f} | Symptom-Only P@{K}: {symptom_p:.3f}"
        )

    # Save output report
    report_file = Path("model_comparison_report.json")
    report_file.write_text(json.dumps(overall_results, indent=2), encoding="utf-8")
    print(f"\nBenchmark complete! Full report written to {report_file}")

    # Output Presentation Comparison Table
    print("\n" + "=" * 78)
    print("SLIDE TABLE: EMBEDDING MODEL BENCHMARK & SELECTION (DAY 2)")
    print("=" * 78)
    print(f"{'Model':<25} | {'Context':<9} | {'Named P@5':<11} | {'Symptom P@5':<13} | {'Overall P@5':<11}")
    print("-" * 78)
    for name, res in overall_results.items():
        print(
            f"{name:<25} | {str(res['context_window_tokens']) + ' t':<9} | {res['named_precision_at_5']:<11.3f} | {res['symptom_precision_at_5']:<13.3f} | {res['overall_precision_at_5']:<11.3f}"
        )
    print("=" * 78 + "\n")


if __name__ == "__main__":
    run_benchmark()