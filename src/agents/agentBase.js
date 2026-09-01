import { generateJson, LLMError } from '../llm/llmClient.js';

export const persona = {
  technicalAgent: 'Technical Market Agent',
  fundamentalAgent: 'Fundamental & Filing Agent',
  sentimentAgent: 'Sentiment & Flow Agent'
};

export function buildPrompt(name, instructions, profile, context = {}) {
  return [
    `You are ${persona[name]}.`,
    'Analyze only supplied financial data. Educational intelligence only; never guarantee returns or invent evidence.',
    'Return ONLY JSON with agent_name, signal_label, confidence_score, reasoning, cited_sources, risk_notes, stance.',
    `INSTRUCTIONS: ${instructions}`,
    `MARKET: ${JSON.stringify(profile.marketData || {})}`,
    `PROFILE: ${JSON.stringify({ risk_tolerance: profile.risk_tolerance, investment_horizon: profile.investment_horizon, portfolio_holdings: profile.portfolio_holdings })}`,
    `SOURCES: ${JSON.stringify(context.sources || [])}`
  ].join('\n');
}

function normalize(name, output) {
  if (!output || typeof output !== 'object') throw new LLMError('Invalid agent output', 'INVALID_AGENT_OUTPUT');
  const confidence = Number(output.confidence_score);
  if (!Number.isFinite(confidence)) throw new LLMError('Missing numeric confidence', 'INVALID_AGENT_OUTPUT');

  return {
    agent_name: persona[name],
    signal_label: ['Bullish', 'Bearish', 'Neutral', 'Conflicted', 'Unavailable'].includes(output.signal_label) ? output.signal_label : 'Unavailable',
    confidence_score: Math.max(0, Math.min(100, Math.round(confidence))),
    reasoning: String(output.reasoning || ''),
    cited_sources: Array.isArray(output.cited_sources) ? output.cited_sources : [],
    risk_notes: Array.isArray(output.risk_notes) ? output.risk_notes : [],
    stance: String(output.stance || ''),
    error: null
  };
}

export async function runAgent(name, instructions, profile, context = {}) {
  const prompt = buildPrompt(name, instructions, profile, context);
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const suffix = attempt ? '\nReturn complete valid JSON with numeric confidence_score.' : '';
      return normalize(name, await generateJson(prompt + suffix));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function fallbackAgent(name, error) {
  return {
    agent_name: persona[name],
    signal_label: 'Unavailable',
    confidence_score: 0,
    reasoning: 'Agent analysis unavailable; no unsupported conclusion was generated.',
    cited_sources: [],
    risk_notes: ['Data or model failure prevented analysis.'],
    stance: 'Unavailable',
    error: { code: error.code || 'AGENT_FAILURE', message: error.message }
  };
}