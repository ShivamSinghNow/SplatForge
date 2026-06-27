interface OvernightRunBannerProps {
  active: boolean;
  beatLabel?: string;
  progress?: number;
}

export function OvernightRunBanner({ active, beatLabel, progress = 0 }: OvernightRunBannerProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="overnight-banner" role="status">
      <div className="overnight-banner-copy">
        <span className="overnight-banner-kicker">scripted presentation</span>
        <strong>UI tour — fixture metrics, not a live run</strong>
        {beatLabel ? <span className="overnight-banner-beat">{beatLabel}</span> : null}
      </div>
      <div aria-hidden="true" className="overnight-banner-progress">
        <span style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  );
}
