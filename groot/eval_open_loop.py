"""GR00T N1.7 open-loop eval: predicted vs ground-truth actions on a real demo.

Uses the repo's `evaluate_single_trajectory` to run GR00T open-loop across a
DROID demo episode, compute action MSE/MAE against the expert ground truth, and
save a trajectory plot (ground-truth vs predicted, per joint). This is the demo
evidence that GR00T's predictions are *accurate*, not just well-formed.

    source ~/miniconda3/etc/profile.d/conda.sh && conda activate gr00t
    cd ~/Isaac-GR00T && MPLBACKEND=Agg python ~/eval_open_loop.py
"""

import json
import os

import gr00t
from gr00t.data.dataset.lerobot_episode_loader import LeRobotEpisodeLoader
from gr00t.data.embodiment_tags import EmbodimentTag
from gr00t.eval.open_loop_eval import evaluate_single_trajectory
from gr00t.policy.gr00t_policy import Gr00tPolicy

MODEL = "nvidia/GR00T-N1.7-3B"
EMB = EmbodimentTag.resolve("OXE_DROID_RELATIVE_EEF_RELATIVE_JOINT")
REPO = os.path.dirname(os.path.dirname(gr00t.__file__))
DATASET = os.path.join(REPO, "demo_data/droid_sample")
PLOT = os.path.expanduser("~/groot_eval_plot.png")
MODALITY = ["joint_position"]  # clean 7-DoF ground-truth-vs-predicted plot

policy = Gr00tPolicy(model_path=MODEL, embodiment_tag=EMB, device="cuda", strict=True)
loader = LeRobotEpisodeLoader(dataset_path=DATASET, modality_configs=policy.get_modality_config())

print("[eval] running open-loop eval (GR00T predicts; compared to expert ground truth)...")
mse, mae = evaluate_single_trajectory(
    policy=policy,
    loader=loader,
    traj_id=0,
    embodiment_tag=EMB,
    modality_keys=MODALITY,
    steps=200,
    action_horizon=16,
    save_plot_path=PLOT,
)

print(f"[eval] joint_position  MSE={float(mse):.5f}  MAE={float(mae):.5f}")
result = {
    "model": MODEL,
    "dataset": "droid_sample",
    "traj_id": 0,
    "modality": MODALITY,
    "mse": float(mse),
    "mae": float(mae),
    "plot": "groot_eval_plot.png",
}
with open(os.path.expanduser("~/groot_eval_result.json"), "w") as f:
    json.dump(result, f, indent=2)
print(f"[eval] saved ~/groot_eval_result.json and {PLOT}")
