import { runAgent } from './agentBase.js';

export default function sentimentAgent(profile) {
  return runAgent(
    'sentimentAgent',
    'Classify market sentiment from supplied news sentiment, FII flow and options positioning. Flag conflicting signals rather than forcing certainty.',
    profile
  );
}