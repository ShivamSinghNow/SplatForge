import type { AppMode, DataSource } from '../../lib/types/dataSource';
import type { SectionMeta } from '../../lib/types/dataSource';

export function AppModeBanner({
  mode,
  description,
  dataSource,
}: {
  mode: AppMode;
  description: string;
  dataSource: DataSource;
}) {
  return (
    <div className={`app-mode-banner mode-${mode}`} title={description}>
      <DataSourceBadge isDemo={mode === 'demo'} source={dataSource} />
      <span className="app-mode-label">{modeLabel(mode)}</span>
      <span className="app-mode-desc">{description}</span>
    </div>
  );
}

export function DataSourceBadge({
  source,
  isDemo,
  label,
}: {
  source: DataSource;
  isDemo?: boolean;
  label?: string;
}) {
  const text = label ?? (isDemo ? 'Demo' : sourceBadgeLabel(source));
  return <span className={`source-badge source-${isDemo ? 'demo' : source}`}>{text}</span>;
}

export function SectionSourceBar({ meta }: { meta: SectionMeta }) {
  return (
    <div className="section-source-bar">
      <DataSourceBadge isDemo={meta.isDemo} label={meta.label} source={meta.source} />
      {meta.lastUpdated ? <span className="section-source-updated">updated {meta.lastUpdated}</span> : null}
    </div>
  );
}

function modeLabel(mode: AppMode): string {
  switch (mode) {
    case 'demo':
      return 'Demo Mode';
    case 'local':
      return 'Local Mode';
    case 'connected':
      return 'Connected Mode';
    case 'missing_config':
      return 'Missing Configuration';
  }
}

function sourceBadgeLabel(source: DataSource): string {
  switch (source) {
    case 'fixture':
      return 'Fixture';
    case 'api':
      return 'API';
    case 'mongodb':
      return 'MongoDB';
    case 'gemini':
      return 'Gemini';
    case 'minimax':
      return 'MiniMax';
    case 'monju':
      return 'Monju';
    case 'rerun':
      return 'Rerun';
    case 'local':
      return 'Local';
    case 'unavailable':
      return 'Unavailable';
  }
}
