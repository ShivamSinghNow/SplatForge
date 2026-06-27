import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LoopStepId } from '../types/splatforge';

export type LoopPhase = 'ready' | 'running' | 'complete';

interface RunContextType {
  currentStep: LoopStepId;
  phase: LoopPhase;
  loading: boolean;
  submittedCommand: string;
  startLoop: (command?: string) => void;
  replayCachedRun: () => void;
  setStep: (step: LoopStepId) => void;
  resetLoop: () => void;
}

const RunContext = createContext<RunContextType | undefined>(undefined);

export function RunProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState<LoopStepId>('world');
  const [phase, setPhase] = useState<LoopPhase>('ready');
  const [loading, setLoading] = useState(false);
  const [submittedCommand, setSubmittedCommand] = useState(
    'Teach the robot to pick up the mug even when the handle is hidden.',
  );

  const replayCachedRun = () => {
    setLoading(true);
    setPhase('running');
    setCurrentStep('attempt');
    const sequence: LoopStepId[] = ['attempt', 'critique', 'curriculum', 'train', 'retest', 'improve'];
    let i = 0;
    const interval = window.setInterval(() => {
      if (i < sequence.length) {
        setCurrentStep(sequence[i]);
        i += 1;
      } else {
        window.clearInterval(interval);
        setLoading(false);
        setPhase('complete');
        setCurrentStep('improve');
      }
    }, 650);
  };

  const startLoop = (command?: string) => {
    setLoading(true);
    setPhase('running');
    if (command?.trim()) {
      setSubmittedCommand(command.trim());
    }
    setCurrentStep('attempt');

    const sequence: LoopStepId[] = ['attempt', 'critique', 'curriculum', 'train', 'retest', 'improve'];
    let i = 0;

    const interval = setInterval(() => {
      if (i < sequence.length) {
        setCurrentStep(sequence[i]);
        i++;
      } else {
        clearInterval(interval);
        setLoading(false);
        setPhase('complete');
        setCurrentStep('improve');
      }
    }, 2000);
  };

  const setStep = (step: LoopStepId) => {
    setCurrentStep(step);
    setPhase(step === 'world' ? 'ready' : step === 'improve' ? 'complete' : 'running');
  };

  const resetLoop = () => {
    setLoading(false);
    setPhase('ready');
    setCurrentStep('world');
  };

  return (
    <RunContext.Provider
      value={{
        currentStep,
        phase,
        loading,
        submittedCommand,
        startLoop,
        replayCachedRun,
        setStep,
        resetLoop,
      }}
    >
      {children}
    </RunContext.Provider>
  );
}

export function useRun() {
  const context = useContext(RunContext);
  if (context === undefined) {
    throw new Error('useRun must be used within a RunProvider');
  }
  return context;
}
