import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Brain,
  Check,
  ChevronRight,
  Database,
  Download,
  Gauge,
  GitBranch,
  HardDrive,
  History,
  Layers,
  Mic2,
  Play,
  RotateCcw,
  Settings,
  Terminal,
} from 'lucide-react';
import { SuccessRateChart } from './components/charts/SuccessRateChart';
import { SplatForgePreview } from './components/preview/SplatForgePreview';
import { createRun, fetchHealth, fetchSuccessRate, type SuccessRateSeries } from './lib/api/client';
import { RunProvider, useRun } from './lib/hooks/useRun';
import { getDemoControlRoomState } from './lib/services/demoSplatForgeService';
import type { CriticResult, IntegrationStatus, LoopStep, LoopStepId, StepStatus, TrainingWorld } from './lib/types/splatforge';

type SectionId = 'control' | 'worlds' | 'runs' | 'memory' | 'council' | 'policy' | 'health';

const state = getDemoControlRoomState();
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
  return (
    <RunProvider>
      <SplatForgeApp />
    </RunProvider>
  );
}

function SplatForgeApp() {
  const { currentStep, phase, loading, submittedCommand, startLoop, replayCachedRun, setStep, resetLoop } =
    useRun();
  const [activeSection, setActiveSection] = useState<SectionId>('control');
  const [command, setCommand] = useState(state.task.instruction);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [notice, setNotice] = useState('Ready');
  const [apiOnline, setApiOnline] = useState(false);
  const [metrics, setMetrics] = useState<SuccessRateSeries>({
    points: [
      { index: 1, success_rate: state.run.scoreBefore, label: 'initial attempt' },
      { index: 2, success_rate: state.run.scoreAfter, label: 'after retest' },
    ],
    current_rate: state.run.scoreAfter,
    source: 'demo',
  });

  const steps = useMemo(() => buildLoopSteps(currentStep), [currentStep]);
  const activeStep = steps.find((step) => step.status === 'active') ?? steps[0];
  const improvement = metrics.current_rate - (metrics.points[0]?.success_rate ?? state.run.scoreBefore);

  useEffect(() => {
    void (async () => {
      try {
        await fetchHealth();
        setApiOnline(true);
        const series = await fetchSuccessRate();
        setMetrics(series);
      } catch {
        setApiOnline(false);
      }
    })();
  }, []);

  async function refreshMetrics(live = false) {
    try {
      const series = await fetchSuccessRate(live);
      setMetrics(series);
    } catch {
      setMetrics({
        points: [
          { index: 1, success_rate: state.run.scoreBefore, label: 'initial attempt' },
          { index: 2, success_rate: state.run.scoreAfter, label: 'after retest' },
        ],
        current_rate: state.run.scoreAfter,
        source: 'demo',
      });
    }
  }

  async function runCommand(nextCommand = command) {
    if (apiOnline) {
      setNotice('Running live loop...');
      try {
        const summary = await createRun('mug_table', 'pick_mug', 'dry-run');
        await refreshMetrics(true);
        replayCachedRun();
        setNotice(summary.phase);
        setActiveSection('runs');
        return;
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Live run failed');
      }
    }
    startLoop(nextCommand);
    setNotice('Run started');
    setActiveSection('runs');
  }

  function selectCommand(nextCommand: string) {
    setCommand(nextCommand);
    setNotice('Command loaded');
  }

  function exportReport() {
    const report = {
      command: submittedCommand,
      world: state.world,
      task: state.task,
      run: state.run,
      critics: state.critics,
      council: state.councilDecision,
      policies: state.policies,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${state.run.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Report exported');
  }

  function openReplay() {
    replayCachedRun();
    setActiveSection('memory');
    setNotice('Replaying cached run');
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
              onClick={() => {
                setActiveSection(item.id);
                setNotice(`${item.label} opened`);
              }}
              type="button"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <StatusBadge label={phase} status={phase === 'complete' ? 'complete' : loading ? 'active' : 'pending'} />
            <span className="mono">{state.run.id}</span>
          </div>
          <div className="topbar-actions">
            <button className="secondary-button" onClick={resetLoop} type="button">
              <RotateCcw size={15} />
              Reset
            </button>
            <button className="secondary-button" onClick={exportReport} type="button">
              <Download size={15} />
              Export
            </button>
            <button className="primary-button" disabled={loading} onClick={() => runCommand()} type="button">
              <Play size={15} />
              {loading ? 'Running' : 'Run'}
            </button>
          </div>
        </header>

        <section className="main-grid">
          <section className="preview-column">
            <SplatForgePreview
              currentStep={currentStep}
              policyVersion={state.run.adapterVersion}
              run={state.run}
              task={state.task}
              world={state.world}
            />
            <CommandPanel
              command={command}
              loading={loading}
              notice={notice}
              onCommandChange={setCommand}
              onRun={runCommand}
              onSelectCommand={selectCommand}
              onToggleVoice={() => {
                setVoiceEnabled((enabled) => !enabled);
                setNotice(voiceEnabled ? 'Voice disabled' : 'Voice enabled');
              }}
              voiceEnabled={voiceEnabled}
            />
          </section>

          <aside className="right-panel">
            <Panel title="Run">
              <SuccessRateChart
                animate={phase === 'complete'}
                currentRate={metrics.current_rate}
                points={metrics.points}
              />
              <KeyValue label="Phase" value={activeStep.label} />
              <KeyValue label="Policy" value={state.run.adapterVersion} />
              <KeyValue
                label="Score"
                value={`${metrics.points[0]?.success_rate ?? state.run.scoreBefore}% -> ${metrics.current_rate}%`}
              />
              <div className="score-line">
                <span style={{ width: `${metrics.points[0]?.success_rate ?? state.run.scoreBefore}%` }} />
                <strong style={{ width: `${metrics.current_rate}%` }} />
              </div>
            </Panel>

            <Panel title="Task">
              <KeyValue label="World" value={state.world.name} />
              <KeyValue label="Target" value={state.task.targetObject} />
              <KeyValue label="Difficulty" value={state.task.difficulty} />
            </Panel>

            <Panel title="Council">
              <p className="short-copy">{state.councilDecision.consensusFailure}</p>
              <div className="critic-mini-list">
                {state.critics.slice(0, 4).map((critic) => (
                  <button key={critic.id} onClick={() => setActiveSection('council')} type="button">
                    <span>{critic.criticName}</span>
                    <strong>{Math.round(critic.score * 100)}%</strong>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Actions">
              <button className="primary-button full-width" disabled={loading} onClick={() => runCommand()} type="button">
                Run loop
              </button>
              <button className="secondary-button full-width" onClick={openReplay} type="button">
                Open replay
              </button>
              <button className="secondary-button full-width" onClick={() => setActiveSection('policy')} type="button">
                View policy
              </button>
            </Panel>
          </aside>
        </section>

        <section className="loop-strip" aria-label="Loop">
          {steps.map((step) => (
            <button
              className={`loop-step loop-step-${step.status}`}
              key={step.id}
              onClick={() => {
                setStep(step.id);
                setNotice(`${step.label} selected`);
              }}
              type="button"
            >
              <span className="loop-node" />
              <strong>{step.label}</strong>
            </button>
          ))}
        </section>

        <section className="detail-panel">
          <DetailSection
            activeSection={activeSection}
            improvement={improvement}
            onExport={exportReport}
            onOpenReplay={openReplay}
            onRun={runCommand}
            onSelectSection={setActiveSection}
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
  onCommandChange,
  onRun,
  onSelectCommand,
  onToggleVoice,
  voiceEnabled,
}: {
  command: string;
  loading: boolean;
  notice: string;
  onCommandChange: (value: string) => void;
  onRun: () => void;
  onSelectCommand: (value: string) => void;
  onToggleVoice: () => void;
  voiceEnabled: boolean;
}) {
  return (
    <section className="command-panel">
      <div className="command-row">
        <Terminal size={18} />
        <input
          aria-label="Robot task command"
          className="command-input"
          onChange={(event) => onCommandChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onRun();
            }
          }}
          placeholder="Teach the robot to pick up the mug even when the handle is hidden..."
          value={command}
        />
        <button className={voiceEnabled ? 'secondary-button voice-on' : 'secondary-button'} onClick={onToggleVoice} type="button">
          <Mic2 size={15} />
          Voice
        </button>
        <button className="primary-button" disabled={loading} onClick={onRun} type="button">
          <Play size={15} />
          Run
        </button>
      </div>
      <div className="command-examples">
        {state.commandExamples.map((example) => (
          <button key={example.id} onClick={() => onSelectCommand(example.label)} type="button">
            {example.label}
          </button>
        ))}
      </div>
      <div className="status-line">{notice}</div>
    </section>
  );
}

function DetailSection({
  activeSection,
  improvement,
  onExport,
  onOpenReplay,
  onRun,
  onSelectSection,
}: {
  activeSection: SectionId;
  improvement: number;
  onExport: () => void;
  onOpenReplay: () => void;
  onRun: () => void;
  onSelectSection: (section: SectionId) => void;
}) {
  if (activeSection === 'worlds') {
    return (
      <DataGrid title="Worlds">
        {state.worlds.map((world) => (
          <WorldCard key={world.id} world={world} />
        ))}
      </DataGrid>
    );
  }

  if (activeSection === 'runs') {
    return (
      <DataGrid title="Runs">
        <DataCard title={state.run.id}>
          <KeyValue label="Rollouts" value={String(state.run.rolloutCount)} />
          <KeyValue label="Before" value={`${state.run.scoreBefore}%`} />
          <KeyValue label="After" value={`${state.run.scoreAfter}%`} />
          <button className="secondary-button" onClick={onOpenReplay} type="button">Open replay</button>
        </DataCard>
        {state.run.failureClusters.map((cluster) => (
          <DataCard key={cluster.id} title={cluster.label}>
            <KeyValue label="Count" value={String(cluster.count)} />
            <KeyValue label="Severity" value={cluster.severity} />
          </DataCard>
        ))}
      </DataGrid>
    );
  }

  if (activeSection === 'memory') {
    return (
      <DataGrid title="Replay Memory">
        <DataCard title="Failed rollouts">
          <KeyValue label="Stored" value={`${state.run.failureClusters.reduce((total, cluster) => total + cluster.count, 0)}`} />
          <KeyValue label="Top failure" value={state.run.failureClusters[0].label} />
        </DataCard>
        <DataCard title="Training data">
          <KeyValue label="Selected" value="18 trajectories" />
          <KeyValue label="Storage" value="local JSONL" />
        </DataCard>
      </DataGrid>
    );
  }

  if (activeSection === 'council') {
    return (
      <DataGrid title="AI Council">
        {state.critics.map((critic) => (
          <CriticCard critic={critic} key={critic.id} />
        ))}
      </DataGrid>
    );
  }

  if (activeSection === 'policy') {
    return (
      <DataGrid title="Policy">
        {state.policies.map((policy) => (
          <DataCard key={policy.id} title={policy.name}>
            <KeyValue label="Adapter" value={policy.adapter} />
            <KeyValue label="Score" value={`${policy.score}%`} />
            <KeyValue label="Trained on" value={policy.trainedOn} />
          </DataCard>
        ))}
      </DataGrid>
    );
  }

  if (activeSection === 'health') {
    return (
      <DataGrid title="Health">
        {state.integrations.map((integration) => (
          <IntegrationCard integration={integration} key={integration.name} />
        ))}
      </DataGrid>
    );
  }

  return (
    <DataGrid title="Control">
      <DataCard title="Current run">
        <KeyValue label="Improvement" value={`+${improvement}%`} />
        <KeyValue label="Command" value={state.task.instruction} />
        <button className="primary-button" onClick={onRun} type="button">Run loop</button>
      </DataCard>
      <DataCard title="Next">
        <button className="secondary-button" onClick={() => onSelectSection('council')} type="button">Council</button>
        <button className="secondary-button" onClick={() => onSelectSection('memory')} type="button">Memory</button>
        <button className="secondary-button" onClick={onExport} type="button">Export</button>
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

function WorldCard({ world }: { world: TrainingWorld }) {
  return (
    <DataCard title={world.name}>
      <KeyValue label="Objects" value={String(world.objects.length)} />
      <KeyValue label="Tasks" value={String(world.tasks.length)} />
      <KeyValue label="Variations" value={String(world.variationsCount)} />
      <KeyValue label="Score" value={`${world.lastScore}%`} />
    </DataCard>
  );
}

function CriticCard({ critic }: { critic: CriticResult }) {
  return (
    <DataCard title={critic.criticName}>
      <KeyValue label="Score" value={`${Math.round(critic.score * 100)}%`} />
      <KeyValue label="Failure" value={critic.failureType} />
      <KeyValue label="Cause" value={critic.rootCause} />
      <KeyValue label="Next" value={critic.suggestion} />
    </DataCard>
  );
}

function IntegrationCard({ integration }: { integration: IntegrationStatus }) {
  return (
    <DataCard title={integration.name}>
      <KeyValue label="Status" value={integration.status} />
      <KeyValue label="Mode" value={integration.mode} />
      <KeyValue label="Env" value={integration.requiredEnvVars.join(', ') || 'none'} />
      <KeyValue label="Fact" value={integration.description} />
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
