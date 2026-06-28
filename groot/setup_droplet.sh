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

# 4. Install GR00T + deps
echo ">> Installing GR00T (this pulls torch; takes a while)..."
pip install --upgrade pip setuptools wheel
pip install -e ".[base]" || pip install -e .
echo ">> Installing flash-attn..."
pip install --no-build-isolation flash-attn==2.7.1.post4 \
  || echo "!! flash-attn install failed -- GR00T may still run with eager attention"

echo ">> Verifying import..."
python -c "import gr00t; print('gr00t import OK:', gr00t.__file__)" \
  || echo "!! gr00t import failed"

echo "================ GR00T setup DONE $(date) ================"
