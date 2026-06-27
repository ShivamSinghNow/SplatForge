from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse

from splatforge.api.schemas import (
    RerunHealthResponse,
    RerunRecordingMetadata,
    RunRequest,
    RunSummary,
    fact_statuses,
    integration_statuses,
    scene_options,
    summarize_run,
    task_options,
)
from splatforge.orchestrator import RunResult, run_practice_loop
from splatforge.paths import RERUN_ROOT, rerun_recording_path
from splatforge.rerun import RerunRecordingService, rerun_sdk_version
from splatforge.rerun.service import rerun_sdk_installed
from splatforge.simulation import list_simulation_backends
from splatforge.storage import build_repository
from splatforge.storage.metrics import build_success_rate_series, merge_run_summary_point

RUNS: dict[str, RunSummary] = {}
RUN_RESULTS: dict[str, RunResult] = {}
RERUN_SERVICE = RerunRecordingService()


def _public_base_url() -> str:
    return os.getenv("SPLATFORGE_PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")


def _rerun_urls(run_id: str) -> dict[str, str]:
    base = _public_base_url()
    file_url = f"{base}/rerun/files/{run_id}.rrd"
    download_url = f"{base}/runs/{run_id}/rerun/download"
    viewer_url = f"{base}/runs/{run_id}/rerun/viewer"
    return {
        "file_url": file_url,
        "download_url": download_url,
        "viewer_url": viewer_url,
    }


def _metadata_response(run_id: str, raw: dict | None) -> RerunRecordingMetadata:
    if not raw:
        urls = _rerun_urls(run_id)
        return RerunRecordingMetadata(
            run_id=run_id,
            exists=False,
            viewer_url=urls["viewer_url"],
            download_url=urls["download_url"],
            file_url=urls["file_url"],
            sdk_version=rerun_sdk_version(),
            viewer_mode="embedded",
        )
    urls = _rerun_urls(run_id)
    return RerunRecordingMetadata(
        run_id=run_id,
        exists=bool(raw.get("exists")),
        path=raw.get("path"),
        viewer_url=urls["viewer_url"],
        download_url=urls["download_url"],
        file_url=urls["file_url"],
        generated_at=raw.get("generated_at"),
        sdk_version=str(raw.get("sdk_version", rerun_sdk_version())),
        viewer_mode=str(raw.get("viewer_mode", "embedded")),
        frame_count=int(raw.get("frame_count", 0)),
        jump_frames=dict(raw.get("jump_frames", {})),
        score_before=float(raw.get("score_before", 0.0)),
        score_after=float(raw.get("score_after", 0.0)),
        scene=raw.get("scene"),
        task=raw.get("task"),
    )


def create_app() -> FastAPI:
    load_dotenv()
    RERUN_ROOT.mkdir(parents=True, exist_ok=True)
    api = FastAPI(
        title="SplatForge",
        description="Local dashboard API for scan-to-simulation robot practice loops.",
        version="0.1.0",
    )
    api.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @api.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "splatforge-api"}

    @api.get("/rerun/health", response_model=RerunHealthResponse)
    def rerun_health() -> RerunHealthResponse:
        recordings = list(RERUN_ROOT.glob("*.rrd"))
        return RerunHealthResponse(
            sdk_installed=rerun_sdk_installed(),
            sdk_version=rerun_sdk_version(),
            viewer_mode="embedded",
            output_path=str(RERUN_ROOT),
            recordings_count=len(recordings),
        )

    @api.get("/rerun/files/{run_id}.rrd")
    def rerun_file(run_id: str) -> FileResponse:
        path = rerun_recording_path(run_id)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Recording not found: {run_id}")
        return FileResponse(path, media_type="application/octet-stream", filename=f"{run_id}.rrd")

    @api.get("/scenes")
    def scenes() -> dict[str, object]:
        return {"scenes": scene_options()}

    @api.get("/tasks")
    def tasks() -> dict[str, object]:
        return {"tasks": task_options()}

    @api.get("/backends")
    def backends() -> dict[str, object]:
        return {"backends": list_simulation_backends()}

    @api.get("/integrations")
    def integrations() -> dict[str, object]:
        return {"integrations": integration_statuses()}

    @api.get("/facts")
    def facts(scene: str = "mug_table") -> dict[str, object]:
        return fact_statuses(scene).model_dump()

    @api.get("/failures/similar")
    def similar_failures(query: str, limit: int = 5) -> dict[str, object]:
        repository = build_repository()
        records = repository.query_similar_failures(query=query, limit=limit)
        return {
            "query": query,
            "results": [record.model_dump(mode="json") for record in records],
        }

    @api.get("/metrics/success-rate")
    def success_rate() -> dict[str, object]:
        repository = build_repository()
        return build_success_rate_series(repository).model_dump()

    @api.post("/runs", response_model=RunSummary)
    def create_run(request: RunRequest) -> RunSummary:
        try:
            result = run_practice_loop(
                scene_name=request.scene,
                task_name=request.task,
                backend_name=request.backend,
                max_variants=request.max_variants,
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        summary = summarize_run(result)
        RUNS[summary.run_id] = summary
        RUN_RESULTS[summary.run_id] = result
        try:
            RERUN_SERVICE.create_recording(summary.run_id, summary, result)
        except Exception:
            pass
        return summary

    @api.get("/metrics/success-rate/live")
    def success_rate_live() -> dict[str, object]:
        repository = build_repository()
        series = build_success_rate_series(repository)
        if RUNS:
            latest = next(reversed(RUNS.values()))
            series = merge_run_summary_point(series, latest.model_dump())
        return series.model_dump()

    @api.get("/runs")
    def list_runs() -> dict[str, object]:
        return {"runs": list(reversed(RUNS.values()))}

    @api.get("/runs/{run_id}", response_model=RunSummary)
    def get_run(run_id: str) -> RunSummary:
        if run_id not in RUNS:
            raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")
        return RUNS[run_id]

    @api.post("/runs/{run_id}/rerun/generate", response_model=RerunRecordingMetadata)
    def generate_rerun(run_id: str) -> RerunRecordingMetadata:
        summary = RUNS.get(run_id)
        if not summary:
            raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")
        if not rerun_sdk_installed():
            raise HTTPException(status_code=503, detail="rerun-sdk is not installed")
        result = RUN_RESULTS.get(run_id)
        raw = RERUN_SERVICE.create_recording(run_id, summary, result)
        return _metadata_response(run_id, raw)

    @api.get("/runs/{run_id}/rerun", response_model=RerunRecordingMetadata)
    def get_rerun_metadata(run_id: str) -> RerunRecordingMetadata:
        raw = RERUN_SERVICE.get_metadata(run_id)
        return _metadata_response(run_id, raw)

    @api.get("/runs/{run_id}/rerun/download")
    def download_rerun(run_id: str) -> FileResponse:
        path = rerun_recording_path(run_id)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Recording not found: {run_id}")
        return FileResponse(path, media_type="application/octet-stream", filename=f"{run_id}.rrd")

    @api.get("/runs/{run_id}/rerun/viewer")
    def rerun_viewer(run_id: str) -> RedirectResponse:
        path = rerun_recording_path(run_id)
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Recording not found: {run_id}")
        version = rerun_sdk_version()
        file_url = f"{_public_base_url()}/rerun/files/{run_id}.rrd"
        iframe_url = f"https://app.rerun.io/version/{version}/index.html?url={file_url}"
        return RedirectResponse(iframe_url)

    @api.post("/rerun/test-recording", response_model=RerunRecordingMetadata)
    def test_rerun_recording() -> RerunRecordingMetadata:
        if not rerun_sdk_installed():
            raise HTTPException(status_code=503, detail="rerun-sdk is not installed")
        run_id = "rerun_test"
        summary = next(iter(RUNS.values()), None)
        if summary is None:
            raise HTTPException(status_code=400, detail="Create a run first to build a test recording")
        raw = RERUN_SERVICE.create_recording(run_id, summary, RUN_RESULTS.get(summary.run_id))
        return _metadata_response(run_id, raw)

    return api


app = create_app()
