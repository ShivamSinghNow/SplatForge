# GR00T inference spike

Run NVIDIA **Isaac GR00T N1.5** (generalist robot manipulation foundation model)
on our GPU droplet and get it to produce actions for a pick task — proving we can
drive a real robot foundation model, not just our own small policy.

## Infra
- DigitalOcean droplet, **NVIDIA L40S (48 GB)**, Ubuntu 22.04, CUDA driver 590.
- Host + key are in the repo `.env` (`DO_DROPLET_HOST`, `DO_SSH_KEY_PATH`); gitignored.

```bash
HOST=root@$DO_DROPLET_HOST        # from .env
ssh -i $DO_SSH_KEY_PATH $HOST
```

## Setup (one-time, on the droplet)
`setup_droplet.sh` installs Miniconda, clones Isaac-GR00T, makes a py3.10 env,
installs GR00T + flash-attn. It runs in a tmux session so it survives disconnects.

```bash
scp -i $DO_SSH_KEY_PATH groot/setup_droplet.sh $HOST:~/
ssh -i $DO_SSH_KEY_PATH $HOST 'tmux new -d -s groot "bash ~/setup_droplet.sh"'
ssh -i $DO_SSH_KEY_PATH $HOST 'tail -f ~/groot_setup.log'   # watch progress
```

## Inference
`run_inference.py` loads the GR00T N1.5 policy and runs it on a sample
observation (robot images + state + the language instruction), printing the
predicted action chunk. See that file for the exact command once setup finishes.

## Notes
- Honest framing: this is a **spike** — proof that GR00T loads and infers on our
  infra and emits actions for our task. It is not (yet) wired into the live loop.
- CUDA toolkit on the box is 13.1; torch ships its own CUDA runtime, and we use a
  prebuilt flash-attn wheel, so the system nvcc version should not matter.
