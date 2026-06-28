#!/usr/bin/env bash
# Set up NVIDIA Isaac GR00T N1.5 on the DigitalOcean L40S droplet for an
# inference spike. Idempotent-ish: safe to re-run. Logs to ~/groot_setup.log.
#
#   scp groot/setup_droplet.sh root@$DO_DROPLET_HOST:~/
#   ssh root@$DO_DROPLET_HOST 'tmux new -d -s groot "bash ~/setup_droplet.sh"'
#   ssh root@$DO_DROPLET_HOST 'tail -f ~/groot_setup.log'
set -uo pipefail
LOG="$HOME/groot_setup.log"
exec > >(tee -a "$LOG") 2>&1
echo "================ GR00T setup started $(date) ================"

# 1. Miniconda (droplet has no conda/pip yet)
if ! command -v conda >/dev/null 2>&1 && [ ! -d "$HOME/miniconda3" ]; then
  echo ">> Installing Miniconda..."
  wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/mc.sh
  bash /tmp/mc.sh -b -p "$HOME/miniconda3"
fi
source "$HOME/miniconda3/etc/profile.d/conda.sh"

# Accept Anaconda channel ToS (recent miniconda blocks env creation otherwise).
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main 2>/dev/null || true
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r 2>/dev/null || true

# 2. Clone Isaac-GR00T
cd "$HOME"
if [ ! -d Isaac-GR00T ]; then
  echo ">> Cloning Isaac-GR00T..."
  git clone https://github.com/NVIDIA/Isaac-GR00T.git
fi
cd Isaac-GR00T

# 3. Python 3.10 env
if ! conda env list | grep -q "^gr00t "; then
  echo ">> Creating conda env gr00t (python 3.10)..."
  conda create -n gr00t python=3.10 -y
fi
conda activate gr00t

# 4. Install in the right order. flash-attn's build imports torch, so torch must
#    go first; then install the PREBUILT flash-attn wheel (no CUDA source build);
#    then the rest of GR00T (torch + flash-attn already satisfied).
pip install --upgrade pip setuptools wheel
echo ">> Installing torch 2.7.1 (cu128)..."
pip install torch==2.7.1 torchvision==0.22.1 --index-url https://download.pytorch.org/whl/cu128
echo ">> Installing prebuilt flash-attn wheel (no source compile)..."
pip install "https://github.com/Dao-AILab/flash-attention/releases/download/v2.7.4.post1/flash_attn-2.7.4.post1+cu12torch2.7cxx11abiFALSE-cp310-cp310-linux_x86_64.whl"
echo ">> Installing GR00T (editable; pulls transformers etc.)..."
pip install -e .

# CUDA 13 box: torch 2.7 pins Triton 3.3.1, which doesn't recognize CUDA 13 and
# RuntimeErrors at inference. GR00T ships a patch for exactly this.
if [ -f scripts/patch_triton_cuda13.sh ]; then
  echo ">> Patching Triton for CUDA 13..."
  bash scripts/patch_triton_cuda13.sh || echo "!! triton patch failed (may not be needed)"
fi

echo ">> Verifying..."
python -c "import torch, flash_attn, gr00t; print('OK -> torch', torch.__version__, '| cuda', torch.version.cuda, '| flash_attn', flash_attn.__version__, '| cuda avail', torch.cuda.is_available())" \
  || echo "!! verification import failed"

echo "================ GR00T setup DONE $(date) ================"
