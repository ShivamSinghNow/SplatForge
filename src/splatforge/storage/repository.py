from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from pydantic import BaseModel


class Repository(ABC):
    @abstractmethod
    def save(self, collection: str, document: BaseModel | dict[str, Any]) -> None:
        raise NotImplementedError


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


class MongoRepository(Repository):
    def __init__(self, uri: str, database: str) -> None:
        from pymongo import MongoClient

        self.client = MongoClient(uri)
        self.database = self.client[database]

    def save(self, collection: str, document: BaseModel | dict[str, Any]) -> None:
        self.database[collection].insert_one(_to_jsonable(document))


def build_repository() -> Repository:
    uri = os.getenv("MONGODB_URI")
    if uri:
        database = os.getenv("MONGODB_DATABASE", "splatforge")
        return MongoRepository(uri=uri, database=database)
    return JsonlRepository()
