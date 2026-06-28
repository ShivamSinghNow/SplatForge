from __future__ import annotations

import os

# Pinned Gemini model IDs — single source of truth for LLM integrations.
GEMINI_CRITIC_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI_CURRICULUM_MODEL = os.getenv("GEMINI_CURRICULUM_MODEL", GEMINI_CRITIC_MODEL)
GEMINI_VLM_MODEL = os.getenv("GEMINI_VLM_MODEL", GEMINI_CRITIC_MODEL)

# MiniMax — second independent LLM critic in the council.
MINIMAX_CRITIC_MODEL = os.getenv("MINIMAX_MODEL", "MiniMax-Text-01")
MINIMAX_BASE_URL = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io/v1")
