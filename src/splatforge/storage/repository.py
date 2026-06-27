from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from splatforge.contracts.failure import FailureRecord
from splatforge.models import FailureReport
from splatforge.storage.embeddings import VoyageEmbedder
from splatforge.storage.failures import failure_record_from_report, rank_similar_failures


class Repository(ABC):
    @abstractmethod
    def save(self, collection: str, document: BaseModel | dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def find(self, collection: str, limit: int | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError

    def index_failure(self, report: FailureReport, embedder: VoyageEmbedder | None = None) -> FailureRecord:
        record = failure_record_from_report(report, embedder=embedder)
        self.save("failure_records", record)
        return record

    def list_failure_records(self, limit: int | None = None) -> list[FailureRecord]:
        return [
            FailureRecord.model_validate(document)
            for document in self.find("failure_records", limit=limit)
        ]

    def query_similar_failures(
        self,
        query: str,
        limit: int = 5,
        embedder: VoyageEmbedder | None = None,
    ) -> list[FailureRecord]:
        embedder = embedder or VoyageEmbedder()
        query_embedding, _model = embedder.embed(query)
        ranked = rank_similar_failures(query_embedding, self.list_failure_records(), limit=limit)
        return [record for record, _score in ranked]


def _to_jsonable(document: BaseModel | dict[str, Any]) -> dict[str, Any]:
    if isinstance(document, BaseModel):
        return document.model_dump(mode="json")
    return document


class JsonlRepository(Repository):
    def __init__(self, root: Path = Path("runs")) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, collection: str, document: BaseModel | dict[str, Any]) -> None:
        path = self.root / f"{collection}.jsonl"
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(_to_jsonable(document), sort_keys=True) + "\n")

    def find(self, collection: str, limit: int | None = None) -> list[dict[str, Any]]:
        path = self.root / f"{collection}.jsonl"
        if not path.exists():
            return []
        documents: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                documents.append(json.loads(line))
        if limit is not None:
            return documents[-limit:]
        return documents


class MongoRepository(Repository):
    def __init__(self, uri: str, database: str) -> None:
        from pymongo import MongoClient

        self.client = MongoClient(uri)
        self.database = self.client[database]

    def save(self, collection: str, document: BaseModel | dict[str, Any]) -> None:
        self.database[collection].insert_one(_to_jsonable(document))

    def find(self, collection: str, limit: int | None = None) -> list[dict[str, Any]]:
        cursor = self.database[collection].find({}, sort=[("_id", 1)])
        if limit is not None:
            cursor = cursor.limit(limit)
        return list(cursor)


def build_repository() -> Repository:
    uri = os.getenv("MONGODB_URI")
    if uri:
        database = os.getenv("MONGODB_DATABASE", "splatforge")
        return MongoRepository(uri=uri, database=database)
    return JsonlRepository()
