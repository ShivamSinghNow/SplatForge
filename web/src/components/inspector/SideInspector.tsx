import type { RerunHealth } from '../../lib/api/rerun';
import type { InspectorSectionId, InspectorViewModel } from '../../lib/types/inspector';
import type { TaskConfig } from '../../lib/types/inspector';
import { AICouncilPanel } from './AICouncilPanel';
import { CurriculumPanel } from './CurriculumPanel';
import { MissionPanel } from './MissionPanel';
import { PolicyLabPanel } from './PolicyLabPanel';
import { ReplayMemoryPanel } from './ReplayMemoryPanel';
import { RobotPanel } from './RobotPanel';
import { SidePanelCarousel } from './SidePanelCarousel';
import { SystemHealthPanel } from './SystemHealthPanel';
import { TaskBuilderPanel } from './TaskBuilderPanel';

interface SideInspectorProps {
  model: InspectorViewModel;
  activeSection: InspectorSectionId;
  onSectionChange: (section: InspectorSectionId) => void;
  loading: boolean;
  apiOnline: boolean;
  isDemo: boolean;
  onRobotChange: (patch: Partial<InspectorViewModel['robot']>) => void;
  onTaskChange: (patch: Partial<TaskConfig>) => void;
  onTaskExample: (example: { label: string; taskType: TaskConfig['taskType'] }) => void;
  onRun: () => void;
  onToggleVariation: (id: string) => void;
  rerunHealth?: RerunHealth | null;
  onTestRerun?: () => void;
}

export function SideInspector({
  model,
  activeSection,
  onSectionChange,
  loading,
  apiOnline,
  isDemo,
  onRobotChange,
  onTaskChange,
  onTaskExample,
  onRun,
  onToggleVariation,
  rerunHealth,
  onTestRerun,
}: SideInspectorProps) {
  return (
    <aside className="side-inspector" aria-label="Mission inspector">
      <SidePanelCarousel activeSection={activeSection} onSectionChange={onSectionChange}>
        {activeSection === 'mission' ? <MissionPanel mission={model.mission} /> : null}
        {activeSection === 'robot' ? <RobotPanel onChange={onRobotChange} robot={model.robot} /> : null}
        {activeSection === 'task' ? (
          <TaskBuilderPanel
            apiOnline={apiOnline}
            catalog={model.catalog}
            isDemo={isDemo}
            loading={loading}
            onChange={onTaskChange}
            onExampleSelect={onTaskExample}
            onRun={onRun}
            task={model.task}
          />
        ) : null}
        {activeSection === 'council' ? <AICouncilPanel council={model.council} /> : null}
        {activeSection === 'curriculum' ? (
          <CurriculumPanel curriculum={model.curriculum} onToggleVariation={onToggleVariation} />
        ) : null}
        {activeSection === 'memory' ? <ReplayMemoryPanel memory={model.memory} /> : null}
        {activeSection === 'policy' ? <PolicyLabPanel policy={model.policy} /> : null}
        {activeSection === 'health' ? (
          <SystemHealthPanel
            apiReachable={apiOnline}
            health={model.health}
            onTestRerun={onTestRerun}
            rerunHealth={rerunHealth}
          />
        ) : null}
      </SidePanelCarousel>
    </aside>
  );
}
