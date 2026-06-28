import {
  commandExamples,
  demoCouncilDecision,
  demoCriticResults,
  demoIntegrations,
  demoPolicies,
  demoTrainingRuns,
  demoWorlds,
  grootInference,
} from '../fixtures/splatforgeDemo';

export function getDemoControlRoomState() {
  const world = demoWorlds[0];
  const task = world.tasks[0];
  const run = demoTrainingRuns[0];
  const policyBefore = demoPolicies.find((policy) => policy.id === run.policyBefore) ?? demoPolicies[0];
  const policyAfter = demoPolicies.find((policy) => policy.id === run.policyAfter) ?? demoPolicies[demoPolicies.length - 1];

  return {
    world,
    worlds: demoWorlds,
    task,
    run,
    critics: demoCriticResults.filter((critic) => critic.runId === run.id),
    councilDecision: demoCouncilDecision,
    policies: demoPolicies,
    policyBefore,
    policyAfter,
    integrations: demoIntegrations,
    commandExamples,
    groot: grootInference,
  };
}
