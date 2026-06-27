"""Small neural grasp policy with a real PEFT/LoRA adapter (SPL-11 / A5).

The policy is a tiny MLP that maps a (noisy) observation of the mug to a grasp
target. The base network is initialised to predict (0, 0) — i.e. the "aim at
nominal" baseline from A3/A6 — and a LoRA adapter, trained on the system's own
successful rollouts, learns the correction. So enabling the adapter is literally
"the model updated its own weights from self-generated experience."

torch + peft are an optional dependency (`pip install -e ".[train]"`); this module
is NOT imported by `splatforge.policy.__init__`, so the core package stays light.
"""

from __future__ import annotations

import json
from pathlib import Path

import torch
from torch import nn

OBS_DIM = 2
ACTION_DIM = 2
HIDDEN = 64


class GraspNet(nn.Module):
    def __init__(self, hidden: int = HIDDEN) -> None:
        super().__init__()
        self.fc_in = nn.Linear(OBS_DIM, hidden)
        self.fc_hidden = nn.Linear(hidden, hidden)
        self.fc_out = nn.Linear(hidden, ACTION_DIM)
        # Base predicts (0, 0) -> nominal aim. The LoRA adapter supplies the fix.
        nn.init.zeros_(self.fc_out.weight)
        nn.init.zeros_(self.fc_out.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = torch.relu(self.fc_in(x))
        x = torch.relu(self.fc_hidden(x))
        return self.fc_out(x)


def build_lora_policy(r: int = 8, alpha: int = 16):
    """A GraspNet wrapped with a LoRA adapter on its hidden + output layers."""
    from peft import LoraConfig, get_peft_model

    base = GraspNet()
    config = LoraConfig(
        r=r,
        lora_alpha=alpha,
        target_modules=["fc_hidden", "fc_out"],
        lora_dropout=0.0,
        bias="none",
    )
    return get_peft_model(base, config)


class NeuralGraspPolicy:
    """Wraps a (LoRA-adapted) GraspNet and exposes `predict(obs) -> (x, y)`."""

    def __init__(self, model: nn.Module, r: int = 8, alpha: int = 16) -> None:
        self.model = model
        self.r = r
        self.alpha = alpha
        self.model.eval()

    @classmethod
    def new_lora(cls, r: int = 8, alpha: int = 16) -> NeuralGraspPolicy:
        return cls(build_lora_policy(r=r, alpha=alpha), r=r, alpha=alpha)

    def predict(self, obs: tuple[float, float], use_adapter: bool = True) -> tuple[float, float]:
        tensor = torch.tensor([list(obs)], dtype=torch.float32)
        device = next(self.model.parameters()).device
        tensor = tensor.to(device)
        if use_adapter:
            with torch.no_grad():
                out = self.model(tensor)[0]
        else:
            # Adapter off -> base network (predicts nominal (0,0)): the "before" baseline.
            with torch.no_grad(), self.model.disable_adapter():
                out = self.model(tensor)[0]
        return float(out[0]), float(out[1])

    def save(self, path: str | Path) -> None:
        # Save the FULL model state (random base + LoRA), not just the adapter:
        # the base is randomly initialised, so the adapter alone is meaningless on
        # reload. Also keep peft's adapter export for inspection/compat.
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        torch.save(self.model.state_dict(), path / "policy.pt")
        (path / "lora.json").write_text(json.dumps({"r": self.r, "alpha": self.alpha}))
        self.model.save_pretrained(str(path))

    @classmethod
    def load(cls, path: str | Path) -> NeuralGraspPolicy:
        path = Path(path)
        meta_path = path / "lora.json"
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {"r": 8, "alpha": 16}
        r, alpha = int(meta["r"]), int(meta["alpha"])
        model = build_lora_policy(r=r, alpha=alpha)
        model.load_state_dict(torch.load(path / "policy.pt", map_location="cpu"))
        return cls(model, r=r, alpha=alpha)
