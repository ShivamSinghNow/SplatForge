from pathlib import Path

from splatforge.api.schemas import fact_statuses
from splatforge.gating import verify_h100_droplet, verify_splat_asset
from splatforge.models import SceneSpec


def test_splat_asset_requires_existing_non_placeholder_file(tmp_path):
    scene = SceneSpec(
        scene_id="scene_test",
        name="Test scene",
        splat_asset=Path("assets/test.splat"),
        metadata={
            "scan_source": "phone_video_placeholder",
            "public_fallback_splat": "demo/assets/public_truck_reconstruction_7000.ply",
        },
    )

    missing = verify_splat_asset(scene, root=tmp_path)
    assert missing.verified is False
    assert "Missing asset" in missing.evidence
    assert "public_truck_reconstruction_7000.ply" in missing.next_step

    asset = tmp_path / "assets" / "test.splat"
    asset.parent.mkdir()
    asset.write_bytes(b"splat")

    placeholder = verify_splat_asset(scene, root=tmp_path)
    assert placeholder.verified is False
    assert "placeholder" in placeholder.evidence

    scene.metadata = {"scan_source": "polycam_export"}
    verified = verify_splat_asset(scene, root=tmp_path)
    assert verified.verified is True


def test_h100_droplet_requires_identity_and_h100_gpu_type():
    assert verify_h100_droplet({}).verified is False
    assert verify_h100_droplet({"DIGITALOCEAN_WORKER_URL": "https://worker.example"}).verified is False
    assert (
        verify_h100_droplet(
            {
                "DIGITALOCEAN_H100_DROPLET_ID": "123456",
                "DIGITALOCEAN_GPU_TYPE": "NVIDIA H100",
            }
        ).verified
        is True
    )


def test_fact_statuses_reports_required_gates():
    response = fact_statuses()

    facts = {fact.id: fact for fact in response.facts}
    assert facts["splat_asset"].verified is False
    assert facts["h100_droplet"].verified is False
