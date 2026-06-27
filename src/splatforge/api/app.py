from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from splatforge.api.schemas import (
    RunRequest,
    RunSummary,
    TaskOption,
    fact_statuses,
    integration_statuses,
    scene_options,
    summarize_run,
)
from splatforge.orchestrator import run_practice_loop
from splatforge.simulation import list_simulation_backends
from splatforge.storage import build_repository
from splatforge.storage.metrics import build_success_rate_series, demo_success_rate_series, merge_run_summary_point

RUNS: dict[str, RunSummary] = {}


def create_app() -> FastAPI:
    load_dotenv()
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

    @api.get("/scenes")
    def scenes() -> dict[str, object]:
        return {"scenes": scene_options()}

    @api.get("/tasks")
    def tasks() -> dict[str, object]:
        return {
            "tasks": [
                TaskOption(
                    id="pick_mug",
                    name="Pick Mug",
                    description="Pick up a mug from the tabletop and move it to the goal zone.",
                )
            ]
        }

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
    def success_rate(use_demo: bool = False) -> dict[str, object]:
        if use_demo:
            return demo_success_rate_series().model_dump()
        repository = build_repository()
        series = build_success_rate_series(repository)
        if not series.points:
            return demo_success_rate_series().model_dump()
        return series.model_dump()

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
        return summary

    @api.get("/metrics/success-rate/live")
    def success_rate_live() -> dict[str, object]:
        repository = build_repository()
        series = build_success_rate_series(repository)
        if not series.points and RUNS:
            latest = next(reversed(RUNS.values()))
            series = merge_run_summary_point(demo_success_rate_series(), latest.model_dump())
        elif RUNS:
            latest = next(reversed(RUNS.values()))
            series = merge_run_summary_point(series, latest.model_dump())
        if not series.points:
            return demo_success_rate_series().model_dump()
        return series.model_dump()

    @api.get("/runs/{run_id}", response_model=RunSummary)
    def get_run(run_id: str) -> RunSummary:
        if run_id not in RUNS:
            raise HTTPException(status_code=404, detail=f"Run not found: {run_id}")
        return RUNS[run_id]

    return api


app = create_app()
