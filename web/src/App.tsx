import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Brain,
  Download,
  Film,
  Gauge,
  GitBranch,
  HardDrive,
  History,
  Layers,
  Mic2,
  Play,
  RotateCcw,
  Settings,
  Square,
  Terminal,
} from 'lucide-react';
import { OvernightRunBanner } from './components/demo/OvernightRunBanner';
import { SuccessRateChart } from './components/charts/SuccessRateChart';
import { SideInspector } from './components/inspector/SideInspector';
import { RerunViewerPanel } from './components/rerun/RerunViewerPanel';
import { AppModeBanner } from './components/shared/DataHonesty';
import { useAppMode } from './hooks/useAppMode';
import { useControlRoomData } from './hooks/useControlRoomData';
import { useDemoPresentation, type DemoBeat } from './hooks/useDemoPresentation';
import { useRerunRecording } from './hooks/useRerunRecording';
import { mapInspectorToNav, mapNavToInspector, useInspectorState } from './hooks/useInspectorState';
import type { CriticCard, IntegrationStatus, RunSummary, SuccessRateSeries } from './lib/api/types';
import { rerunDownloadUrl, testRerunRecording, type RerunRecordingMetadata } from './lib/api/rerun';
import { mapHonestIntegrations } from './lib/services/integrationService';
import { scoreFromRun } from './lib/render/buildRenderViewport';
import type { LoopStep, LoopStepId, StepStatus } from './lib/types/splatforge';

type SectionId = 'control' | 'worlds' | 'runs' | 'memory' | 'council' | 'policy' | 'health';

const loopOrder: LoopStepId[] = ['world', 'attempt', 'critique', 'curriculum', 'train', 'retest', 'improve'];

const navItems: Array<{ id: SectionId; label: string; icon: ReactNode }> = [
  { id: 'control', label: 'Control', icon: <Gauge size={17} /> },
  { id: 'worlds', label: 'Worlds', icon: <Layers size={17} /> },
  { id: 'runs', label: 'Runs', icon: <History size={17} /> },
  { id: 'memory', label: 'Memory', icon: <HardDrive size={17} /> },
  { id: 'council', label: 'Council', icon: <Brain size={17} /> },
  { id: 'policy', label: 'Policy', icon: <GitBranch size={17} /> },
  { id: 'health', label: 'Health', icon: <Settings size={17} /> },
];

export default function App() {
  const {
    apiOnline,
    usingFixtures,
    loading,
    notice,
    scenes,
    tasks,
    integrations,
    runs,
    selectedScene,
    selectedTask,
    setSelectedScene,
    setSelectedTask,
    activeRun,
    selectRun,
    currentStep,
    setCurrentStep,
    metrics,
    submittedCommand,
    runLoop,
    resetLoop,
  } = useControlRoomData();

  const [activeSection, setActiveSection] = useState<SectionId>('control');
  const [command, setCommand] = useState('');
  const [demoMetrics, setDemoMetrics] = useState<SuccessRateSeries | null>(null);
  const [demoJumpTarget, setDemoJumpTarget] = useState<DemoBeat['rerunJump'] | undefined>(undefined);

  const selectedTaskMeta = tasks.find((task) => task.id === selectedTask);
  const selectedSceneMeta = scenes.find((scene) => scene.id === selectedScene);
  const steps = useMemo(() => buildLoopSteps(currentStep), [currentStep]);
  const scores = scoreFromRun(activeRun);
  const improvement = scores.after - scores.before;
  const phase = loading ? 'running' : activeRun ? 'complete' : 'ready';
  const appMode = useAppMode({ apiOnline, usingFixtures, integrations });

  const {
    activeSection: inspectorSection,
    setActiveSection: setInspectorSection,
    model: inspectorModel,
    updateRobot,
    updateTask,
    toggleVariation,
  } = useInspectorState({
    activeRun,
    scenes,
    tasks,
    selectedScene,
    selectedTask,
    selectedTaskDescription: command || selectedTaskMeta?.description || '',
    currentStep,
    loading,
    phase,
    apiOnline,
    integrations,
    scores,
    dataSource: appMode.dataSource,
    isDemo: appMode.isDemo,
  });

  const chartMetrics = demoMetrics ?? metrics;

  const handleDemoBeat = useCallback(
    (beat: DemoBeat) => {
      setCurrentStep(beat.loopStep);
      if (beat.navSection) {
        setActiveSection(beat.navSection);
      }
      if (beat.inspectorSection) {
        setInspectorSection(beat.inspectorSection);
      }
      if (beat.rerunJump) {
        setDemoJumpTarget(beat.rerunJump);
      }
      if (beat.curvePoints) {
        setDemoMetrics({
          points: beat.curvePoints,
          current_rate: beat.curvePoints[beat.curvePoints.length - 1]?.success_rate ?? metrics.current_rate,
          source: 'demo-presentation',
        });
      }
    },
    [metrics.current_rate, setCurrentStep, setInspectorSection],
  );

  const demo = useDemoPresentation({ onBeat: handleDemoBeat });

  const activeRunId = activeRun?.run_id ?? null;
  const {
    metadata: rerunMetadata,
    health: rerunHealth,
    loading: rerunLoading,
    error: rerunError,
    refresh: refreshRerun,
    generate: generateRerun,
  } = useRerunRecording(activeRunId);

  async function runCommand(nextCommand = command) {
    const instruction = nextCommand || inspectorModel.task.instruction || selectedTaskMeta?.description || '';
    setCommand(instruction);
    updateTask({ instruction });
    const summary = await runLoop(instruction);
    if (summary) {
      setActiveSection('runs');
      setInspectorSection('policy');
      await refreshRerun();
    }
  }

  function handleNavClick(section: SectionId) {
    setActiveSection(section);
    const mapped = mapNavToInspector(section);
    if (mapped) {
      setInspectorSection(mapped);
    }
  }

  function handleInspectorSection(section: typeof inspectorSection) {
    setInspectorSection(section);
    const mapped = mapInspectorToNav(section);
    if (mapped) {
      setActiveSection(mapped as SectionId);
    }
  }

  function exportReport() {
    if (!activeRun) {
      return;
    }
    const report = {
      command: submittedCommand,
      scene: selectedScene,
      task: selectedTask,
      run: activeRun,
      metrics,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeRun.run_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="side-rail" aria-label="Navigation">
        <div className="brand-lockup">
          <span className="brand-mark">SF</span>
          <strong>SplatForge</strong>
        </div>
        <nav className="product-nav">
          {navItems.map((item) => (
            <button
              className={activeSection === item.id ? 'nav-item active' : 'nav-item'}
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              type="button"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <OvernightRunBanner active={demo.active} beatLabel={demo.beat?.label} progress={demo.progress} />
        <header className="topbar">
          <div className="topbar-left">
            <AppModeBanner
              dataSource={appMode.dataSource}
              description={appMode.modeDescription}
              mode={appMode.mode}
            />
            <StatusBadge
              label={apiOnline ? 'api reachable' : 'api offline'}
              status={apiOnline ? 'complete' : 'failed'}
            />
            <StatusBadge label={phase} status={phase === 'complete' ? 'complete' : loading ? 'active' : 'pending'} />
            <span className="mono">{activeRun?.run_id ?? 'no run'}</span>
            {usingFixtures ? <span className="source-badge source-demo">Fixture data</span> : null}
          </div>
          <div className="topbar-actions">
            <select
              aria-label="Scene"
              className="scene-select"
              onChange={(event) => setSelectedScene(event.target.value)}
              value={selectedScene}
            >
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Task"
              className="scene-select"
              onChange={(event) => setSelectedTask(event.target.value)}
              value={selectedTask}
            >
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
            <button
              className="secondary-button"
              disabled={demo.active}
              onClick={() => demo.start()}
              title="Scripted UI tour with fixture success-rate curve — not a live run"
              type="button"
            >
              <Film size={15} />
              {demo.active ? 'Presenting' : 'Scripted tour'}
            </button>
            {demo.active ? (
              <button
                className="secondary-button"
                onClick={() => {
                  demo.stop();
                  setDemoMetrics(null);
                  setDemoJumpTarget(undefined);
                }}
                type="button"
              >
                <Square size={15} />
                Stop
              </button>
            ) : null}
            <button className="secondary-button" onClick={resetLoop} type="button">
              <RotateCcw size={15} />
              Reset
            </button>
            <button className="secondary-button" disabled={!activeRun} onClick={exportReport} type="button">
              <Download size={15} />
              Export
            </button>
            <button
              className="primary-button"
              disabled={loading || !apiOnline || usingFixtures || !selectedScene || !selectedTask}
              onClick={() => runCommand()}
              title={usingFixtures ? 'Start API for live runs' : !apiOnline ? 'API offline' : 'POST /runs'}
              type="button"
            >
              <Play size={15} />
              {loading ? 'Running' : 'Run'}
            </button>
          </div>
        </header>

        <section className="main-grid">
          <section className="preview-column">
            <RerunViewerPanel
              demoJumpTarget={demoJumpTarget}
              error={rerunError}
              health={rerunHealth}
              loading={rerunLoading}
              metadata={rerunMetadata}
              onGenerate={() => void generateRerun()}
              onRefresh={() => void refreshRerun()}
              runId={activeRunId}
            />
            <CommandPanel
              apiOnline={apiOnline}
              command={command}
              isDemo={appMode.isDemo}
              loading={loading}
              notice={notice}
              onCommandChange={setCommand}
              onRun={() => void runCommand()}
              placeholder={selectedTaskMeta?.description ?? 'select a task'}
            />
          </section>

          <aside className="right-panel">
            <SideInspector
              activeSection={inspectorSection}
              apiOnline={apiOnline}
              isDemo={appMode.isDemo}
              loading={loading}
              model={inspectorModel}
              onRobotChange={updateRobot}
              onRun={() => runCommand()}
              onSectionChange={handleInspectorSection}
              onTaskChange={updateTask}
              onTaskExample={(example) => {
                updateTask({ instruction: example.label, taskType: example.taskType });
                setCommand(example.label);
              }}
              onToggleVariation={toggleVariation}
              onTestRerun={() => void testRerunRecording().then(() => refreshRerun())}
              rerunHealth={rerunHealth}
            />
            <Panel title={demo.active ? 'Success rate (scripted fixture)' : 'Success rate'}>
              <SuccessRateChart
                animate={demo.active || phase === 'complete'}
                currentRate={chartMetrics.current_rate}
                points={chartMetrics.points}
              />
              {demo.active ? <p className="status-line">Fixture curve from scripted tour — not from episodes.jsonl</p> : null}
              {usingFixtures && !demo.active ? (
                <p className="status-line">Metrics source: {metrics.source}</p>
              ) : null}
            </Panel>
          </aside>
        </section>

        <section className="loop-strip" aria-label="Loop">
          {steps.map((step) => (
            <button
              className={`loop-step loop-step-${step.status}`}
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              type="button"
            >
              <span className="loop-node" />
              <strong>{step.label}</strong>
            </button>
          ))}
        </section>

        <section className="detail-panel">
          <DetailSection
            activeRun={activeRun}
            activeSection={activeSection}
            improvement={improvement}
            integrations={integrations}
            onExport={exportReport}
            onGenerateRerun={() => void generateRerun()}
            onOpenRerun={() => {
              if (activeRunId) {
                window.open(`/api/runs/${activeRunId}/rerun/viewer`, '_blank');
              }
            }}
            onRun={runCommand}
            onSelectRun={(runId) => {
              selectRun(runId);
              void refreshRerun();
            }}
            onSelectSection={(section) => {
              setActiveSection(section);
              const mapped = mapNavToInspector(section);
              if (mapped) {
                setInspectorSection(mapped);
              }
            }}
            runs={runs}
            scenes={scenes}
          />
        </section>
      </main>
    </div>
  );
}

function CommandPanel({
  command,
  loading,
  notice,
  placeholder,
  apiOnline,
  isDemo,
  onCommandChange,
  onRun,
}: {
  command: string;
  loading: boolean;
  notice: string;
  placeholder: string;
  apiOnline: boolean;
  isDemo: boolean;
  onCommandChange: (value: string) => void;
  onRun: () => void;
}) {
  const canRun = apiOnline && !isDemo && !loading;
  return (
    <section className="command-panel">
      <div className="command-row">
        <Terminal size={18} />
        <input
          aria-label="Robot task command"
          className="command-input"
          onChange={(event) => onCommandChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canRun) {
              onRun();
            }
          }}
          placeholder={placeholder}
          value={command}
        />
        <button
          className="secondary-button"
          disabled
          title="Voice commands not wired — LiveKit integration not implemented"
          type="button"
        >
          <Mic2 size={15} />
          Voice
        </button>
        <button
          className="primary-button"
          disabled={!canRun}
          onClick={onRun}
          title={isDemo ? 'Start API for live runs' : !apiOnline ? 'API offline' : 'POST /runs'}
          type="button"
        >
          <Play size={15} />
          Run
        </button>
      </div>
      <div className="status-line">{notice}</div>
    </section>
  );
}

function DetailSection({
  activeSection,
  activeRun,
  improvement,
  integrations,
  onExport,
  onGenerateRerun,
  onOpenRerun,
  onRun,
  onSelectRun,
  onSelectSection,
  runs,
  scenes,
}: {
  activeSection: SectionId;
  activeRun: RunSummary | null;
  improvement: number;
  integrations: IntegrationStatus[];
  onExport: () => void;
  onGenerateRerun: () => void;
  onOpenRerun: () => void;
  onRun: () => void;
  onSelectRun: (runId: string) => void;
  onSelectSection: (section: SectionId) => void;
  runs: RunSummary[];
  scenes: Array<{ id: string; name: string; path: string }>;
}) {
  if (activeSection === 'worlds') {
    return (
      <DataGrid title="Worlds">
        {scenes.length ? (
          scenes.map((scene) => (
            <DataCard key={scene.id} title={scene.name}>
              <KeyValue label="ID" value={scene.id} />
              <KeyValue label="Path" value={scene.path} />
            </DataCard>
          ))
        ) : (
          <EmptyCard message="no scenes from api" />
        )}
      </DataGrid>
    );
  }

  if (activeSection === 'runs') {
    return (
      <DataGrid title="Runs">
        {runs.length ? (
          runs.map((run) => (
            <DataCard key={run.run_id} title={run.run_id}>
              <KeyValue label="Scene" value={run.scene} />
              <KeyValue label="Task" value={run.task} />
              <KeyValue label="Phase" value={run.phase} />
              <KeyValue label="Initial" value={run.initial_attempt.status} />
              <KeyValue label="Retest" value={run.retest?.status ?? '—'} />
              <button className="secondary-button" onClick={() => onSelectRun(run.run_id)} type="button">
                Load run
              </button>
              <button className="secondary-button" onClick={onGenerateRerun} type="button">
                Generate Rerun
              </button>
              <button
                className="secondary-button"
                onClick={() => window.open(`/api/runs/${run.run_id}/rerun/viewer`, '_blank')}
                type="button"
              >
                Open Rerun Viewer
              </button>
              <button
                className="secondary-button"
                onClick={() => window.open(rerunDownloadUrl(run.run_id), '_blank')}
                type="button"
              >
                Download .rrd
              </button>
            </DataCard>
          ))
        ) : (
          <EmptyCard message="no runs yet" />
        )}
      </DataGrid>
    );
  }

  if (activeSection === 'memory') {
    return (
      <DataGrid title="Replay Memory">
        {activeRun ? (
          <>
            <DataCard title="Rerun recording">
              <KeyValue label="Failure frame" value="frame 4" />
              <KeyValue label="Gemini critique" value="frame 5" />
              <KeyValue label="Policy version" value={activeRun.retest?.policy_version ?? activeRun.initial_attempt.policy_version} />
              <button className="secondary-button" onClick={onOpenRerun} type="button">
                Open failure replay
              </button>
              <button className="secondary-button" onClick={onGenerateRerun} type="button">
                Regenerate recording
              </button>
            </DataCard>
            <DataCard title="Evidence">
              {(activeRun.evidence.length ? activeRun.evidence : ['no evidence recorded']).map((item) => (
                <p className="short-copy" key={item}>
                  {item}
                </p>
              ))}
            </DataCard>
            <DataCard title="Collections">
              {activeRun.log_collections.map((collection) => (
                <KeyValue key={collection} label="log" value={collection} />
              ))}
            </DataCard>
          </>
        ) : (
          <EmptyCard message="select or run a loop first" />
        )}
      </DataGrid>
    );
  }

  if (activeSection === 'council') {
    return (
      <DataGrid title="AI Council">
        {activeRun?.critics.length ? (
          activeRun.critics.map((critic) => <ApiCriticCard critic={critic} key={critic.name} />)
        ) : (
          <EmptyCard message="no critic output yet" />
        )}
      </DataGrid>
    );
  }

  if (activeSection === 'policy') {
    return (
      <DataGrid title="Policy">
        {activeRun ? (
          <>
            <DataCard title="Before / after">
              <KeyValue label="Initial policy" value={activeRun.initial_attempt.policy_version} />
              <KeyValue label="Retest policy" value={activeRun.retest?.policy_version ?? '—'} />
              <KeyValue label="Initial status" value={activeRun.initial_attempt.status} />
              <KeyValue label="Retest status" value={activeRun.retest?.status ?? '—'} />
              <button className="secondary-button" onClick={onOpenRerun} type="button">
                Compare in Rerun
              </button>
            </DataCard>
            {activeRun.policy_changes.length ? (
              activeRun.policy_changes.map((change) => (
                <DataCard key={change.parameter} title={change.parameter}>
                  <KeyValue label="Before" value={String(change.before)} />
                  <KeyValue label="After" value={String(change.after)} />
                </DataCard>
              ))
            ) : (
              <EmptyCard message="no policy changes yet" />
            )}
          </>
        ) : (
          <EmptyCard message="no policy changes yet" />
        )}
      </DataGrid>
    );
  }

  if (activeSection === 'health') {
    return (
      <DataGrid title="Health">
        {integrations.map((integration) => (
          <IntegrationCard integration={integration} key={integration.id} />
        ))}
      </DataGrid>
    );
  }

  return (
    <DataGrid title="Control">
      <DataCard title="Current run">
        <KeyValue label="Improvement" value={activeRun ? `+${improvement}%` : '—'} />
        <KeyValue label="Command" value={activeRun?.task ?? '—'} />
        <button className="primary-button" onClick={onRun} type="button">
          Run loop
        </button>
      </DataCard>
      <DataCard title="Next">
        <button className="secondary-button" onClick={() => onSelectSection('council')} type="button">
          Council
        </button>
        <button className="secondary-button" onClick={() => onSelectSection('memory')} type="button">
          Memory
        </button>
        <button className="secondary-button" disabled={!activeRun} onClick={onExport} type="button">
          Export
        </button>
      </DataCard>
    </DataGrid>
  );
}

function buildLoopSteps(currentStep: LoopStepId): LoopStep[] {
  const activeIndex = loopOrder.indexOf(currentStep);
  const copy: Record<LoopStepId, { label: string; detail: string }> = {
    world: { label: 'World', detail: 'Loaded' },
    attempt: { label: 'Attempt', detail: 'Running' },
    critique: { label: 'Critique', detail: 'Review' },
    curriculum: { label: 'Curriculum', detail: 'Generate' },
    train: { label: 'Train', detail: 'Adapter' },
    retest: { label: 'Retest', detail: 'Original' },
    improve: { label: 'Improve', detail: 'Proof' },
  };

  return loopOrder.map((id, index) => {
    let status: StepStatus = 'pending';
    if (index < activeIndex) {
      status = 'complete';
    } else if (index === activeIndex) {
      status = 'active';
    }
    return { id, status, ...copy[id] };
  });
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function DataGrid({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="detail-title">
        <h2>{title}</h2>
      </div>
      <div className="data-grid">{children}</div>
    </>
  );
}

function DataCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="data-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <DataCard title="—">
      <p className="short-copy">{message}</p>
    </DataCard>
  );
}

function ApiCriticCard({ critic }: { critic: CriticCard }) {
  return (
    <DataCard title={critic.name}>
      <KeyValue label="Confidence" value={`${Math.round(critic.confidence * 100)}%`} />
      <KeyValue label="Active" value={critic.active ? 'yes' : 'no'} />
      <KeyValue label="Cause" value={critic.root_cause} />
      <KeyValue label="Evidence" value={critic.evidence.join('; ') || '—'} />
    </DataCard>
  );
}

function IntegrationCard({ integration }: { integration: IntegrationStatus }) {
  return (
    <DataCard title={integration.label}>
      <KeyValue label="Configured" value={integration.configured ? 'yes' : 'no'} />
      <KeyValue label="Purpose" value={integration.purpose} />
      <KeyValue label="Next" value={integration.next_step} />
    </DataCard>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status, label }: { status: StepStatus | 'complete'; label: string }) {
  return <span className={`status-badge status-${status}`}>{label}</span>;
}
