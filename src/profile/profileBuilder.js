import { z } from 'zod';

export const ProfileSchema = z.object({
  risk_tolerance: z.enum(['Conservative', 'Moderate', 'Aggressive']),
  portfolio_holdings: z.array(z.object({
    symbol: z.string(),
    allocation: z.number().min(0).max(100)
  })).default([]),
  investment_horizon: z.enum(['Short-term', 'Medium-term', 'Long-term']),
  interaction_history: z.array(z.object({
    event: z.string(),
    timestamp: z.string()
  })).default([]),
  marketData: z.record(z.any()).default({})
});

export function buildProfile(input = {}) {
  return ProfileSchema.parse({
    risk_tolerance: input.risk_tolerance || input.riskTolerance || 'Moderate',
    investment_horizon: input.investment_horizon || input.investmentHorizon || 'Medium-term',
    portfolio_holdings: Array.isArray(input.portfolio_holdings) ? input.portfolio_holdings : [],
    interaction_history: Array.isArray(input.interaction_history) ? input.interaction_history : [],
    marketData: input.marketData || input.market_feed || {}
  });
}

export function riskWeight(profile) {
  return { Conservative: 0.55, Moderate: 0.75, Aggressive: 1 }[profile.risk_tolerance];
}

export function concentrationScore(profile) {
  return Math.round(Math.max(0, ...profile.portfolio_holdings.map(item => item.allocation)));
}