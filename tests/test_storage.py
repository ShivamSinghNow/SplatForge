from splatforge.contracts.failure import FailureRecord
from splatforge.models import FailureReport
from splatforge.storage.embeddings import VoyageEmbedder, cosine_similarity
from splatforge.storage.repository import JsonlRepository


class KeywordEmbedder(VoyageEmbedder):
    def embed(self, text: str) -> tuple[list[float], str]:
        tokens = {
            "handle": 0,
            "occlusion": 1,
            "occluded": 1,
            "blocked": 2,
            "grasp": 3,
            "slipped": 4,
            "camera": 5,
            "rim": 6,
        }
        vector = [0.0] * 8
        for word, index in tokens.items():
            if word in text.lower():
                vector[index] = 1.0
        return vector, "keyword-test"


def _report(episode_id: str, root_cause: str) -> FailureReport:
    return FailureReport(
        episode_id=episode_id,
        root_cause=root_cause,
        evidence=[root_cause],
        suggested_variants=[],
        policy_hints={},
        critic_outputs=[],
        confidence=0.5,
    )


def test_repository_indexes_and_queries_similar_failures(tmp_path):
    repository = JsonlRepository(root=tmp_path)
    embedder = KeywordEmbedder(api_key=None)
    repository.index_failure(
        _report("episode_a", "grasp slipped on wet mug handle"),
        embedder=embedder,
    )
    repository.index_failure(
        _report("episode_b", "occluded handle blocked the gripper"),
        embedder=embedder,
    )
    repository.index_failure(
        _report("episode_c", "camera angle missed the mug rim"),
        embedder=embedder,
    )

    matches = repository.query_similar_failures(
        "handle occlusion blocked grasp",
        limit=2,
        embedder=embedder,
    )
    assert len(matches) == 2
    assert matches[0].episode_id == "episode_b"


def test_cosine_similarity_prefers_identical_vectors():
    vector = [1.0, 0.0, 0.0]
    assert cosine_similarity(vector, vector) == 1.0
    assert cosine_similarity(vector, [0.0, 1.0, 0.0]) == 0.0


def test_failure_record_round_trip(tmp_path):
    repository = JsonlRepository(root=tmp_path)
    record = repository.index_failure(_report("episode_x", "object rotated away from gripper"))
    loaded = repository.list_failure_records(limit=1)[0]
    assert isinstance(loaded, FailureRecord)
    assert loaded.episode_id == record.episode_id
    assert loaded.embedding
