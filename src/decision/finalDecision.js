import { generateJson } from '../llm/llmClient.js';
import { riskWeight, concentrationScore } from '../profile/profileBuilder.js';

export function fallbackDecision(agents, reason, profile = { risk_tolerance: 'Moderate', portfolio_holdings: [] }) {
  const live = agents.filter(agent => !agent.error);
  return {
    recommendation: live.length ? 'Insufficient confidence — monitor' : 'Unable to complete analysis',
    confidence: live.length
      ? Math.round(live.reduce((sum, agent) => sum + agent.confidence_score, 0) / live.length)
      : 0,
    rationale: 'A complete synthesis could not be produced from the available data.',
    portfolio_concentration_score: concentrationScore(profile),
    cited_sources: live.flatMap(agent => agent.cited_sources).slice(0, 6),
    risk_notes: ['Degraded-data fallback active.', reason]
  };
}

export async function synthesizeFinalDecision(profile, agents, debate) {
  const prompt = [
    'You synthesize financial intelligence for education and research.',
    'Do not guarantee returns or present certainty where evidence is missing.',
    'User risk profile: ' + profile.risk_tolerance,
    'Investment horizon: ' + profile.investment_horizon,
    'Risk weight: ' + riskWeight(profile),
    'Agents: ' + JSON.stringify(agents),
    'Conflicts: ' + JSON.stringify(debate.disagreedPoints),
    'Return ONLY JSON with recommendation, confidence, rationale, risk_notes and cited_sources.',
    'Recommendation must be more cautious for Conservative users when signals conflict.'
  ].join('\n');

  const result = await generateJson(prompt, { timeoutMs: 30000 });
  return {
    ...result,
    confidence: Math.max(0, Math.min(100, Math.round(Number(result.confidence) || 0))),
    portfolio_concentration_score: concentrationScore(profile),
    profile_risk_tolerance: profile.risk_tolerance
  };
}