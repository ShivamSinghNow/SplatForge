from splatforge.models import AttemptStatus, Episode, Observation, RobotAction, TaskSpec
from splatforge.storage.metrics import build_success_rate_series
from splatforge.storage.repository import JsonlRepository


def _episode(status: AttemptStatus) -> Episode:
    return Episode(
        scene_id="scene_test",
        task=TaskSpec(name="pick_mug", object_name="mug", goal="pick"),
        robot_adapter="dry-run",
        policy_version="policy_v0",
        status=status,
        observation=Observation(),
        action=RobotAction(command="grasp"),
    )


def test_success_rate_series_climbs_with_retest_success(tmp_path):
    repository = JsonlRepository(root=tmp_path)
    repository.save("episodes", _episode(AttemptStatus.FAILURE))
    repository.save("episodes", _episode(AttemptStatus.SUCCESS))

    series = build_success_rate_series(repository)
    assert len(series.points) == 2
    assert series.points[0].success_rate == 0.0
    assert series.points[1].success_rate == 50.0
    assert series.current_rate == 50.0
