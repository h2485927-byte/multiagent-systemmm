import { runAgent } from './agentBase.js';

export default function technicalAgent(profile) {
  return runAgent(
    'technicalAgent',
    'Classify price momentum using price change, RSI, moving averages and volume anomaly. Explain the signal and confidence from supplied metrics.',
    profile
  );
}