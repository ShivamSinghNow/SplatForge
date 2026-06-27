from __future__ import annotations

from splatforge.contracts.failure import FailureRecord
from splatforge.models import FailureReport
from splatforge.storage.embeddings import VoyageEmbedder, cosine_similarity


def failure_record_from_report(
    report: FailureReport,
    embedder: VoyageEmbedder | None = None,
) -> FailureRecord:
    embedder = embedder or VoyageEmbedder()
    note = " | ".join(report.evidence)
    embedding, model = embedder.embed(f"{report.root_cause} {note}")
    return FailureRecord(
        episode_id=report.episode_id,
        root_cause=report.root_cause,
        evidence=report.evidence,
        note=note,
        embedding=embedding,
        embedding_model=model,
    )


def rank_similar_failures(
    query_embedding: list[float],
    records: list[FailureRecord],
    limit: int = 5,
) -> list[tuple[FailureRecord, float]]:
    scored = [
        (record, cosine_similarity(query_embedding, record.embedding))
        for record in records
        if record.embedding
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:limit]
