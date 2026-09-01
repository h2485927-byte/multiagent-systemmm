import { runAgent } from './agentBase.js';
import { retrieveRelevantFiling } from '../llm/ragEngine.js';

export default async function fundamentalAgent(profile) {
  const sources = await retrieveRelevantFiling('revenue profit asset quality risks filing');
  return runAgent(
    'fundamentalAgent',
    'Analyze fundamentals using only retrieved filing snippets. Every fundamental claim must be grounded in cited_sources with line references.',
    profile,
    { sources }
  );
}