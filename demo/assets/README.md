Ignored runtime assets live here.

The demo scene currently references `demo/assets/mug_table.splat`, but no
captured mug-table splat is present in this repository yet. Until that scan is
captured, use the public fallback documented in `docs/f2_gating_facts.md`.

To materialize the fallback asset locally:

```bash
python scripts/fetch_public_splat.py
```

The downloaded `.ply` file is intentionally ignored by git because public 3DGS
assets are large binary artifacts.
