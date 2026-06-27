from __future__ import annotations

import pytest

pytest.importorskip("rerun")

from splatforge.api.schemas import summarize_run
from splatforge.orchestrator.workflow import run_practice_loop
from splatforge.paths import rerun_recording_path
from splatforge.rerun.service import RerunRecordingService, rerun_sdk_installed


def test_rerun_sdk_installed() -> None:
    assert rerun_sdk_installed()


def test_generate_rerun_recording(tmp_path, monkeypatch) -> None:
    import splatforge.paths as paths

    monkeypatch.setattr(paths, "RUNS_ROOT", tmp_path)
    monkeypatch.setattr(paths, "RERUN_ROOT", tmp_path / "rerun")
    result = run_practice_loop(scene_name="mug_table", task_name="pick_mug", backend_name="dry-run")
    summary = summarize_run(result, run_id="run_test_rerun")
    service = RerunRecordingService()
    metadata = service.create_recording(summary.run_id, summary, result)
    path = rerun_recording_path(summary.run_id)
    assert metadata["exists"] is True
    assert path.exists()
    assert path.stat().st_size > 500
