from __future__ import annotations

import hashlib
import json
import math
import os
import ssl
import urllib.error
import urllib.request


VOYAGE_EMBED_MODEL = os.getenv("VOYAGE_EMBED_MODEL", "voyage-3-lite")
VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


class VoyageEmbedder:
    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or os.getenv("VOYAGE_API_KEY")
        self.model = model or VOYAGE_EMBED_MODEL

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def embed(self, text: str) -> tuple[list[float], str]:
        cleaned = text.strip()
        if not cleaned:
            return [], self.model if self.enabled else "empty-text"
        if not self.enabled:
            return _deterministic_embedding(cleaned), "deterministic-local"
        payload = json.dumps({"input": [cleaned], "model": self.model}).encode("utf-8")
        request = urllib.request.Request(
            VOYAGE_API_URL,
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "SplatForge/0.1",
            },
            method="POST",
        )
        context = ssl.create_default_context()
        try:
            with urllib.request.urlopen(request, context=context, timeout=30) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.URLError:
            return _deterministic_embedding(cleaned), "deterministic-local"
        embeddings = body.get("data", [])
        if not embeddings:
            return _deterministic_embedding(cleaned), "deterministic-local"
        vector = embeddings[0].get("embedding", [])
        return list(vector), self.model


def _deterministic_embedding(text: str, dimensions: int = 32) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    for index in range(dimensions):
        byte = digest[index % len(digest)]
        values.append((byte / 255.0) * 2.0 - 1.0)
    return values
