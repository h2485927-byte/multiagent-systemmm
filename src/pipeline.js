import technicalAgent from './agents/technicalAgent.js';
import fundamentalAgent from './agents/fundamentalAgent.js';
import sentimentAgent from './agents/sentimentAgent.js';
import { fallbackAgent } from './agents/agentBase.js';
import { runDebate } from './debate/debate.js';
import { synthesizeFinalDecision, fallbackDecision } from './decision/finalDecision.js';
import { buildProfile, concentrationScore } from './profile/profileBuilder.js';

const wrap = (name, fn, profile) => fn(profile).catch(error => fallbackAgent(name, error));

export async function runPipeline(input, { onProgress = () => {} } = {}) {
  const started = Date.now();
  const profile = buildProfile(input);

  onProgress({ step: 1, status: 'complete' });
  onProgress({ step: 2, status: 'running' });

  const agents = await Promise.all([
    wrap('technicalAgent', technicalAgent, profile),
    wrap('fundamentalAgent', fundamentalAgent, profile),
    wrap('sentimentAgent', sentimentAgent, profile)
  ]);

  onProgress({ step: 2, status: 'complete', agents });
  onProgress({ step: 3, status: 'running' });

  let debate;
  try {
    debate = await runDebate(profile, agents);
  } catch (error) {
    debate = {
      transcript: [],
      agreedPoints: [],
      disagreedPoints: [{ point: 'Debate unavailable', agents: [], evidence: [] }],
      shiftedStances: [],
      unresolvedStances: agents.map(agent => ({
        agent: agent.agent_name,
        stance: agent.stance || 'Unavailable',
        evidence: agent.cited_sources || []
      })),
      error: error.message
    };
  }

  onProgress({ step: 3, status: 'complete' });
  onProgress({ step: 4, status: 'running' });

  let finalDecision;
  try {
    finalDecision = await synthesizeFinalDecision(profile, agents, debate);
  } catch (error) {
    finalDecision = fallbackDecision(agents, error.message, profile);
  }

  onProgress({ step: 4, status: 'complete' });

  return {
    profile,
    agents,
    debate,
    finalDecision,
    metrics: {
      session_latency_ms: Date.now() - started,
      signal_accuracy_30d: null,
      portfolio_risk_concentration_score: concentrationScore(profile)
    },
    diagnostics: {
      failedAgents: agents.filter(agent => agent.error).map(agent => agent.agent_name),
      degradedData: agents.some(agent => agent.error)
        || agents.some(agent => agent.cited_sources.some(source => source.source === 'system')),
      debateFallback: Boolean(debate.error),
      finalDecisionFallback: Boolean(finalDecision.risk_notes?.some(note => note.includes('fallback')))
    }
  };
}