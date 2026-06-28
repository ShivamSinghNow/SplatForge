import type { InspectorSectionId } from '../../lib/types/inspector';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export const INSPECTOR_SECTIONS: Array<{ id: InspectorSectionId; label: string; short: string }> = [
  { id: 'mission', label: 'Mission', short: 'M' },
  { id: 'robot', label: 'Robot', short: 'R' },
  { id: 'task', label: 'Task Builder', short: 'T' },
  { id: 'council', label: 'AI Council', short: 'C' },
  { id: 'curriculum', label: 'Curriculum', short: 'V' },
  { id: 'memory', label: 'Replay Memory', short: 'Mem' },
  { id: 'policy', label: 'Policy Lab', short: 'P' },
  { id: 'health', label: 'System Health', short: 'H' },
];

interface SidePanelCarouselProps {
  activeSection: InspectorSectionId;
  onSectionChange: (section: InspectorSectionId) => void;
  children: ReactNode;
}

export function SidePanelCarousel({ activeSection, onSectionChange, children }: SidePanelCarouselProps) {
  const index = INSPECTOR_SECTIONS.findIndex((section) => section.id === activeSection);
  const current = INSPECTOR_SECTIONS[index] ?? INSPECTOR_SECTIONS[0];

  function go(delta: number) {
    const next = INSPECTOR_SECTIONS[(index + delta + INSPECTOR_SECTIONS.length) % INSPECTOR_SECTIONS.length];
    onSectionChange(next.id);
  }

  return (
    <div className="side-panel-carousel">
      <header className="side-panel-header">
        <div className="side-panel-title-row">
          <button aria-label="Previous panel" className="inspector-nav-btn" onClick={() => go(-1)} type="button">
            <ChevronLeft size={14} />
          </button>
          <div className="side-panel-title-block">
            <span className="side-panel-kicker">Mission inspector</span>
            <h2>{current.label}</h2>
          </div>
          <button aria-label="Next panel" className="inspector-nav-btn" onClick={() => go(1)} type="button">
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="side-panel-progress" aria-label="Panel progress">
          {INSPECTOR_SECTIONS.map((section, sectionIndex) => (
            <button
              aria-current={section.id === activeSection ? 'step' : undefined}
              aria-label={section.label}
              className={section.id === activeSection ? 'progress-dot active' : 'progress-dot'}
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              type="button"
            />
          ))}
        </div>

        <div className="side-panel-tabs" role="tablist">
          {INSPECTOR_SECTIONS.map((section) => (
            <button
              aria-selected={section.id === activeSection}
              className={section.id === activeSection ? 'side-panel-tab active' : 'side-panel-tab'}
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              role="tab"
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>
      </header>

      <div className="side-panel-viewport">{children}</div>
    </div>
  );
}
