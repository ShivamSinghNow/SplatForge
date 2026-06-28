"""GR00T N1.7 inference spike: load the foundation model and predict an action chunk.

Mirrors Isaac-GR00T/getting_started/GR00T_inference.ipynb. Runs on the droplet
inside the `gr00t` conda env. Proves GR00T N1.7 (3B) loads on our L40S and emits
an action chunk for a real (DROID) observation conditioned on a language
instruction.

    ssh root@$DO_DROPLET_HOST
    source ~/miniconda3/etc/profile.d/conda.sh && conda activate gr00t
    cd ~/Isaac-GR00T && python ~/run_inference.py
"""

import json
import os

import gr00t
import numpy as np
import torch
from gr00t.data.dataset.lerobot_episode_loader import LeRobotEpisodeLoader
from gr00t.data.dataset.sharded_single_step_dataset import extract_step_data
from gr00t.data.embodiment_tags import EmbodimentTag
from gr00t.policy.gr00t_policy import Gr00tPolicy

MODEL_PATH = "nvidia/GR00T-N1.7-3B"
EMBODIMENT_TAG = "OXE_DROID_RELATIVE_EEF_RELATIVE_JOINT"
REPO = os.path.dirname(os.path.dirname(gr00t.__file__))
DATASET_PATH = os.path.join(REPO, "demo_data/droid_sample")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[groot] device={device} torch={torch.__version__} cuda={torch.version.cuda}")
if device == "cuda":
    print(f"[groot] GPU: {torch.cuda.get_device_name(0)}")

print(f"[groot] loading {MODEL_PATH} (weights auto-download on first run)...")
policy = Gr00tPolicy(
    model_path=MODEL_PATH,
    embodiment_tag=EmbodimentTag(EMBODIMENT_TAG),
    device=device,
    strict=True,
)
total = sum(p.numel() for p in policy.model.parameters())
print(f"[groot] model loaded: {total:,} parameters")

modality_config = policy.get_modality_config()
dataset = LeRobotEpisodeLoader(dataset_path=DATASET_PATH, modality_configs=modality_config)
episode = dataset[0]
step = extract_step_data(
    episode,
    step_index=0,
    modality_configs=modality_config,
    embodiment_tag=EmbodimentTag(EMBODIMENT_TAG),
    allow_padding=False,
)

observation = {
    "video": {k: np.stack(step.images[k])[None] for k in step.images},
    "state": {k: step.states[k][None] for k in step.states},
    "action": {k: step.actions[k][None] for k in step.actions},
    "language": {modality_config["language"].modality_keys[0]: [[step.text]]},
}
print(f"[groot] instruction: {step.text!r}")
print(f"[groot] obs videos: {[(k, np.stack(step.images[k]).shape) for k in step.images]}")

predicted_action, info = policy.get_action(observation)

print("[groot] PREDICTED ACTION CHUNK:")
summary = {}
for key, value in predicted_action.items():
    arr = np.asarray(value)
    print(f"    {key}: shape={arr.shape} sample={arr.flatten()[:4].round(4).tolist()}")
    summary[key] = {"shape": list(arr.shape), "sample": arr.flatten()[:6].round(5).tolist()}

result = {
    "model": MODEL_PATH,
    "embodiment": EMBODIMENT_TAG,
    "gpu": torch.cuda.get_device_name(0) if device == "cuda" else "cpu",
    "instruction": step.text,
    "param_count": total,
    "action": summary,
}
out_path = os.path.expanduser("~/groot_inference_result.json")
with open(out_path, "w") as f:
    json.dump(result, f, indent=2)
print(f"[groot] wrote {out_path}")
print("[groot] DONE -- GR00T produced an action chunk from a real observation.")
