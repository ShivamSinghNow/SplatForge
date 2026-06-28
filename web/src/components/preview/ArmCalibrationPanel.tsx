import { useState } from 'react';
import type { ArmPlacement } from './robotArm';

interface Props {
  placement: ArmPlacement;
  onChange: (next: ArmPlacement) => void;
}

const ANCHOR_LABELS = ['Can X', 'Can Y (up/down)', 'Can Z'];

// Live calibration overlay for seating the MuJoCo arm in the splat: size it,
// spin it onto the table, and drag the grasp target onto the real can. The arm
// is anchored on the can, so the gripper always lands on the target.
export function ArmCalibrationPanel({ placement, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const anchor = placement.anchor ?? [0, 0, 0];
  const set = (patch: Partial<ArmPlacement>) => onChange({ ...placement, ...patch });
  const setAnchor = (i: number, v: number) => {
    const next = [...anchor] as [number, number, number];
    next[i] = v;
    set({ anchor: next });
  };

  const copyJson = () => {
    const json = JSON.stringify(
      {
        scale: round(placement.scale ?? 1),
        yawDeg: Math.round(placement.yawDeg ?? 0),
        anchor: anchor.map(round),
      },
      null,
      2,
    );
    void navigator.clipboard?.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (!open) {
    return (
      <button className="calib-reopen" type="button" onClick={() => setOpen(true)}>
        Calibrate arm
      </button>
    );
  }

  return (
    <div className="calib-panel">
      <div className="calib-head">
        <strong>Arm calibration</strong>
        <button type="button" onClick={() => setOpen(false)}>
          –
        </button>
      </div>

      <Row label="Scale" value={placement.scale ?? 1} min={0.1} max={3} step={0.02} onChange={(v) => set({ scale: v })} />
      <Row label="Yaw°" value={placement.yawDeg ?? 0} min={-180} max={180} step={1} onChange={(v) => set({ yawDeg: v })} />
      {ANCHOR_LABELS.map((label, i) => (
        <Row
          key={label}
          label={label}
          value={anchor[i]}
          min={i === 1 ? -2 : -2}
          max={i === 1 ? 0.5 : 2}
          step={0.01}
          onChange={(v) => setAnchor(i, v)}
        />
      ))}

      <label className="calib-check">
        <input
          type="checkbox"
          checked={placement.showMarker ?? false}
          onChange={(e) => set({ showMarker: e.target.checked })}
        />
        Show grasp marker
      </label>

      <button className="calib-copy" type="button" onClick={copyJson}>
        {copied ? 'Copied!' : 'Copy placement JSON'}
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="calib-row">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function round(v: number) {
  return Math.round(v * 1000) / 1000;
}
