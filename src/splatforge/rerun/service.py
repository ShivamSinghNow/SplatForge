from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from splatforge.api.schemas import RunSummary
from splatforge.models import AttemptStatus, CriticName
from splatforge.orchestrator import RunResult
from splatforge.paths import rerun_metadata_path, rerun_recording_path


def _rr():
    import rerun as rr

    return rr


def rerun_sdk_version() -> str:
    try:
        return str(getattr(_rr(), "__version__", "unknown"))
    except ImportError:
        return "not_installed"


def rerun_sdk_installed() -> bool:
    try:
        _rr()
        return True
    except ImportError:
        return False


class RerunRecordingService:
    """Logs SplatForge practice-loop telemetry into Rerun .rrd recordings."""

    def __init__(self, application_id: str = "splatforge") -> None:
        self.application_id = application_id

    def create_recording(
        self,
        run_id: str,
        summary: RunSummary,
        result: RunResult | None = None,
    ) -> dict[str, Any]:
        rr = _rr()
        path = rerun_recording_path(run_id)
        path.parent.mkdir(parents=True, exist_ok=True)

        rr.init(f"splatforge/{run_id}", spawn=False)
        rr.save(str(path))

        self._log_static_world(rr, summary)
        frames = self._build_frames(summary, result)
        score_before = 100.0 if summary.initial_attempt.status == AttemptStatus.SUCCESS else 0.0
        score_after = (
            100.0
            if summary.retest and summary.retest.status == AttemptStatus.SUCCESS
            else score_before
        )

        for frame in frames:
            index = frame["index"]
            rr.set_time("frame", sequence=index)
            rr.set_time("loop_step", sequence=index)

            self._log_robot(rr, frame["gripper"], frame["gripper_open"], frame["status"])
            self._log_objects(rr, frame["objects"])
            self._log_trajectory(rr, frame["trajectory"], frame["trajectory_index"])
            self._log_waypoints(rr, frame["trajectory"], frame["trajectory_index"])
            self._log_camera(rr, frame["gripper"])
            self._log_loop_step(rr, frame["step"], frame["label"])
            self._log_markers(rr, frame.get("markers", []))

            for critic in frame.get("critics", []):
                self._log_critic_event(rr, critic)

            score = frame.get("score")
            if score is not None:
                rr.log("training/score", rr.Scalars(score))

        self._log_policy_metadata(rr, summary, score_before, score_after)
        return self.save_recording(run_id, summary, frames, score_before, score_after)

    def _log_static_world(self, rr: Any, summary: RunSummary) -> None:
        rr.log(
            "world/grid",
            rr.LineStrips3D(
                strips=self._grid_strips(),
                colors=[[27, 36, 48]],
                radii=[0.002],
            ),
            static=True,
        )
        rr.log(
            "world/table",
            rr.Boxes3D(
                centers=[[0.0, -0.05, 0.05]],
                half_sizes=[[0.68, 0.05, 0.52]],
                colors=[[32, 36, 45]],
            ),
            static=True,
        )
        rr.log(
            "world/target_zones/goal",
            rr.Boxes3D(
                centers=[[0.55, 0.02, 0.28]],
                half_sizes=[[0.11, 0.01, 0.09]],
                colors=[[61, 217, 232]],
                fill_mode=rr.components.FillMode.MajorWireframe,
            ),
            static=True,
        )
        rr.log(
            "world/camera",
            rr.Pinhole(
                focal_length=220,
                width=640,
                height=480,
                camera_xyz=rr.ViewCoordinates.RUB,
            ),
            static=True,
        )
        rr.log(
            "world/label",
            rr.TextLog(f"{summary.scene} · {summary.task}"),
            static=True,
        )

    def _log_robot(self, rr: Any, gripper: list[float], gripper_open: float, status: str) -> None:
        base = [-0.48, 0.0, -0.14]
        shoulder = [base[0], base[1] + 0.22, base[2]]
        elbow = [
            (shoulder[0] + gripper[0]) / 2,
            (shoulder[1] + gripper[1]) / 2,
            (shoulder[2] + gripper[2]) / 2,
        ]

        rr.log(
            "robot/base",
            rr.Boxes3D(centers=[base], half_sizes=[[0.16, 0.06, 0.16]], colors=[[42, 48, 59]]),
        )
        rr.log(
            "robot/arm",
            rr.LineStrips3D(
                strips=[[shoulder, elbow, gripper]],
                colors=[[75, 163, 255]],
                radii=[0.018],
            ),
        )
        rr.log(
            "robot/shoulder",
            rr.Boxes3D(centers=[shoulder], half_sizes=[[0.05, 0.05, 0.05]], colors=[[75, 163, 255]]),
        )
        rr.log(
            "robot/gripper",
            rr.Boxes3D(
                centers=[gripper],
                half_sizes=[[0.03 + gripper_open * 0.02, 0.04, 0.06]],
                colors=[[210, 216, 226]],
            ),
        )
        rr.log("robot/status", rr.TextLog(status))

    def _log_objects(self, rr: Any, objects: list[dict[str, Any]]) -> None:
        for obj in objects:
            center = obj["center"]
            half = obj["half"]
            color = obj.get("color", [200, 206, 216])
            rr.log(
                f"world/objects/{obj['id']}",
                rr.Boxes3D(centers=[center], half_sizes=[half], colors=[color]),
            )

    def _log_trajectory(self, rr: Any, trajectory: list[list[float]], active_index: int) -> None:
        if len(trajectory) < 2:
            return
        strip = trajectory[: active_index + 1]
        rr.log(
            "robot/trajectory",
            rr.LineStrips3D(strips=[strip], colors=[[75, 163, 255]], radii=[0.008]),
        )

    def _log_waypoints(self, rr: Any, trajectory: list[list[float]], active_index: int) -> None:
        if not trajectory:
            return
        points = trajectory[: active_index + 1]
        rr.log(
            "robot/waypoints",
            rr.Points3D(positions=points, radii=[0.012], colors=[[110, 200, 255]]),
        )

    def _log_camera(self, rr: Any, gripper: list[float]) -> None:
        rr.log(
            "world/camera",
            rr.Transform3D(translation=[gripper[0] + 0.15, gripper[1] + 0.2, gripper[2] + 0.2]),
        )

    def _log_loop_step(self, rr: Any, step: str, label: str) -> None:
        rr.log("timeline/loop_step", rr.TextLog(f"{step}: {label}"))

    def _log_markers(self, rr: Any, markers: list[dict[str, Any]]) -> None:
        for marker in markers:
            path = f"events/{marker['type']}"
            rr.log(
                path,
                rr.Points3D(
                    positions=[marker["position"]],
                    radii=[0.03],
                    colors=[marker.get("color", [255, 93, 115])],
                ),
            )
            rr.log(path, rr.TextLog(marker["label"]))

    def _log_critic_event(self, rr: Any, critic: dict[str, Any]) -> None:
        name = critic["name"]
        path = f"critics/{name}"
        if name == "monju":
            path = "council/monju"
        text = (
            f"success={critic.get('success', False)} "
            f"score={critic.get('score', 0):.2f} "
            f"cause={critic.get('root_cause', '')} "
            f"evidence={'; '.join(critic.get('evidence', []))}"
        )
        rr.log(path, rr.TextLog(text))
        if critic.get("failure_type"):
            rr.log("events/failure", rr.TextLog(f"{name}: {critic['failure_type']} — {critic.get('root_cause', '')}"))

    def _log_policy_metadata(self, rr: Any, summary: RunSummary, score_before: float, score_after: float) -> None:
        policy = (
            summary.retest.policy_version
            if summary.retest
            else summary.initial_attempt.policy_version
        )
        rr.log("training/policy_version", rr.TextLog(policy), static=True)
        rr.log("training/adapter_version", rr.TextLog(policy), static=True)
        rr.log("training/score", rr.Scalars([score_before, score_after]), static=True)

    def _build_frames(
        self,
        summary: RunSummary,
        result: RunResult | None,
    ) -> list[dict[str, Any]]:
        trajectory = [
            [-0.2, 0.45, -0.05],
            [-0.02, 0.34, -0.04],
            [0.14, 0.28, -0.01],
            [0.28, 0.24, 0.0],
            [0.32, 0.22, 0.0],
            [0.52, 0.22, 0.26],
        ]
        mug = [0.32, 0.1, 0.02]
        failure_cause = summary.failure_cause or "unstable grasp during lift"

        critics_by_name: dict[str, dict[str, Any]] = {}
        if result and result.failure_report:
            for critique in result.failure_report.critic_outputs:
                critics_by_name[critique.critic.value] = {
                    "name": critique.critic.value,
                    "success": False,
                    "score": critique.confidence,
                    "failure_type": critique.root_cause.split(".")[0],
                    "root_cause": critique.root_cause,
                    "evidence": critique.evidence,
                    "next_curriculum_hint": ", ".join(critique.suggested_variants[:2]),
                    "training_decision": critique.policy_hints.get("training_decision", "train_adapter"),
                }
        else:
            for card in summary.critics:
                critics_by_name[card.name.value if hasattr(card.name, "value") else str(card.name)] = {
                    "name": str(card.name),
                    "success": not card.active,
                    "score": card.confidence,
                    "failure_type": card.root_cause.split(".")[0],
                    "root_cause": card.root_cause,
                    "evidence": card.evidence,
                    "next_curriculum_hint": summary.variants[0].label if summary.variants else "occluder variant",
                    "training_decision": "train_adapter",
                }

        def gemini() -> dict[str, Any]:
            return critics_by_name.get(
                CriticName.GEMINI.value,
                {
                    "name": "gemini",
                    "success": False,
                    "score": 0.82,
                    "failure_type": "grasp_slip",
                    "root_cause": failure_cause,
                    "evidence": summary.evidence or ["insufficient contact on handle"],
                    "next_curriculum_hint": summary.variants[0].label if summary.variants else "hidden handle variant",
                    "training_decision": "train_adapter",
                },
            )

        timeline_spec: list[tuple[str, str, int, int, str, list, list]] = [
            ("world", "World loaded", 0, 0, "idle", [], []),
            ("attempt", "Robot begins attempt", 1, 1, "moving", [], []),
            ("approach", "Gripper moves to mug", 2, 2, "moving", [], []),
            ("grasp", "Unstable grasp", 3, 3, "grasping", [], []),
            (
                "failure",
                "Failure marker",
                4,
                3,
                "error",
                [{"type": "failure", "position": mug, "label": failure_cause, "color": [201, 74, 90]}],
                [],
            ),
            ("critique", "Gemini critique", 5, 3, "planning", [], []),
            ("curriculum", "Curriculum generated", 6, 3, "planning", [], []),
            ("train", "Training started", 7, 3, "planning", [], []),
            ("retest", "Retest starts", 8, 4, "moving", [], []),
            ("success_grasp", "Successful grasp", 9, 4, "grasping", [], []),
            (
                "goal",
                "Target reached",
                10,
                5,
                "moving",
                [{"type": "success", "position": [0.55, 0.1, 0.28], "label": "retest success", "color": [76, 175, 130]}],
                [],
            ),
            ("improve", "Improvement complete", 11, 5, "completed", [], []),
        ]

        if summary.variants:
            timeline_spec[6] = (
                "curriculum",
                f"Curriculum: {summary.variants[0].label}",
                6,
                3,
                "planning",
                [],
                [
                    {
                        "name": "physics",
                        "root_cause": summary.variants[0].reason,
                        "evidence": [summary.variants[0].label],
                        "score": 0.7,
                        "success": True,
                    }
                ],
            )

        score_before = 0.0
        score_after = 100.0 if summary.retest and summary.retest.status == AttemptStatus.SUCCESS else score_before

        frames: list[dict[str, Any]] = []
        for step, label, index, traj_idx, status, markers, base_critics in timeline_spec:
            critics = list(base_critics)
            if step == "critique":
                critics = [gemini()]
                minimax = critics_by_name.get(CriticName.MINIMAX.value)
                if minimax:
                    critics.append(minimax)
                monju = critics_by_name.get(
                    CriticName.MONJU.value,
                    {
                        "name": "monju",
                        "success": False,
                        "score": 0.76,
                        "root_cause": failure_cause,
                        "evidence": summary.evidence,
                        "training_decision": "apply_curriculum",
                    },
                )
                critics.append(monju)
            score = score_before if index >= 5 else None
            if index >= 10:
                score = score_after
            frames.append(
                {
                    "index": index,
                    "step": step,
                    "label": label,
                    "gripper": trajectory[min(traj_idx, len(trajectory) - 1)],
                    "gripper_open": 0.5 if status == "grasping" else 0.15,
                    "status": status,
                    "trajectory": trajectory,
                    "trajectory_index": traj_idx,
                    "objects": [
                        {
                            "id": "mug",
                            "center": mug,
                            "half": [0.05, 0.09, 0.05],
                            "color": [198, 204, 214],
                        }
                    ],
                    "markers": markers,
                    "critics": critics,
                    "score": score,
                }
            )
        return frames

    def _grid_strips(self) -> list[list[list[float]]]:
        strips: list[list[list[float]]] = []
        for i in range(-6, 7):
            offset = i * 0.2
            strips.append([[-1.2, 0.0, offset], [1.2, 0.0, offset]])
            strips.append([[offset, 0.0, -1.0], [offset, 0.0, 1.0]])
        return strips

    def save_recording(
        self,
        run_id: str,
        summary: RunSummary,
        frames: list[dict[str, Any]],
        score_before: float,
        score_after: float,
    ) -> dict[str, Any]:
        path = rerun_recording_path(run_id)
        generated_at = datetime.now(UTC).isoformat()
        jump_frames = {
            "initial_attempt": 1,
            "failure_frame": 4,
            "gemini_critique": 5,
            "curriculum_generated": 6,
            "retest_success": 10,
        }
        metadata = {
            "run_id": run_id,
            "exists": path.exists(),
            "path": str(path),
            "generated_at": generated_at,
            "sdk_version": rerun_sdk_version(),
            "viewer_mode": "embedded",
            "frame_count": len(frames),
            "jump_frames": jump_frames,
            "score_before": score_before,
            "score_after": score_after,
            "scene": summary.scene,
            "task": summary.task,
        }
        rerun_metadata_path(run_id).write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        return metadata

    def get_recording_path(self, run_id: str) -> str | None:
        path = rerun_recording_path(run_id)
        return str(path) if path.exists() else None

    def get_metadata(self, run_id: str) -> dict[str, Any] | None:
        meta_path = rerun_metadata_path(run_id)
        if meta_path.exists():
            return json.loads(meta_path.read_text(encoding="utf-8"))
        path = rerun_recording_path(run_id)
        if not path.exists():
            return None
        return {
            "run_id": run_id,
            "exists": True,
            "path": str(path),
            "generated_at": None,
            "sdk_version": rerun_sdk_version(),
            "viewer_mode": "embedded",
            "frame_count": 12,
            "jump_frames": {},
        }
