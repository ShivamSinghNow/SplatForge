import { Box, Circle, Layers, PlayCircle, RotateCcw } from 'lucide-react';

export type NavSection = 'console' | 'runs' | 'replays' | 'worlds' | 'council';

interface SidebarProps {
  active: NavSection;
  onSelect: (section: NavSection) => void;
  scene: string;
  runId: string | null;
  apiOnline: boolean;
}

const NAV: Array<{ id: NavSection; label: string; icon: typeof Box }> = [
  { id: 'console', label: 'console', icon: PlayCircle },
  { id: 'runs', label: 'runs', icon: RotateCcw },
  { id: 'replays', label: 'replays', icon: Layers },
  { id: 'worlds', label: 'worlds', icon: Box },
  { id: 'council', label: 'council', icon: Circle },
];

export function Sidebar({ active, onSelect, scene, runId, apiOnline }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">SF</span>
        <div>
          <strong>SplatForge</strong>
          <span>robotics rsi console</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={active === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-modes">
        <span className="modes-label">modes</span>
        <p>
          {apiOnline ? 'connected' : 'offline'} · {scene || '—'}
          <br />
          {runId ?? 'no run loaded'}
        </p>
      </div>
    </aside>
  );
}
