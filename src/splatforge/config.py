from __future__ import annotations

import os

# Pinned Gemini model IDs — single source of truth for LLM integrations.
GEMINI_CRITIC_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
GEMINI_CURRICULUM_MODEL = os.getenv("GEMINI_CURRICULUM_MODEL", GEMINI_CRITIC_MODEL)
GEMINI_VLM_MODEL = os.getenv("GEMINI_VLM_MODEL", GEMINI_CRITIC_MODEL)
