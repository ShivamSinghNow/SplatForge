from splatforge.orchestrator.workflow import run_practice_loop
from splatforge.storage.repository import JsonlRepository


def test_dry_run_loop_closes_failure_to_success(tmp_path):
    result = run_practice_loop(
        scene_name="mug_table",
        task_name="pick_mug",
        robot_name="dry-run",
        repository=JsonlRepository(root=tmp_path),
    )

    assert result.initial_episode.status == "failure"
    assert result.failure_report is not None
    assert result.variants
    assert result.updated_policy is not None
    assert result.retest_episode is not None
    assert result.retest_episode.status == "success"
