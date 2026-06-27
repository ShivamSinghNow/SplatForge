"""Test hygiene: keep the suite hermetic.

Importing the `splatforge.api` package instantiates the FastAPI app at module
level, which calls `load_dotenv()` — so a developer's real `.env` leaks secrets
into the test process and breaks the "no API key" code paths. Clear the secret
env vars before every test; tests that exercise the with-key path pass keys
explicitly. (Root cause to harden later: `api/app.py` builds `app = create_app()`
at import; prefer a uvicorn `--factory` so env isn't loaded on import.)
"""

from __future__ import annotations

import pytest

_SECRET_ENV_VARS = ("GEMINI_API_KEY", "VOYAGE_API_KEY", "MONGODB_URI")


@pytest.fixture(autouse=True)
def _hermetic_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in _SECRET_ENV_VARS:
        monkeypatch.delenv(var, raising=False)
