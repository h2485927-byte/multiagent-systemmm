export async function runDebate(profile, agents) {
  const live = agents.filter(agent => !agent.error);
  const labels = [...new Set(live.map(agent => agent.signal_label))];
  const conflict = labels.length > 1;

  return {
    execution: 'parallel',
    agreedPoints: conflict ? [] : [{
      point: live[0]?.signal_label || 'Unavailable',
      agents: live.map(agent => agent.agent_name),
      evidence: live.flatMap(agent => agent.cited_sources)
    }],
    disagreedPoints: conflict ? [{
      point: 'Agents produced conflicting market signals',
      agents: live.map(agent => agent.agent_name),
      evidence: live.flatMap(agent => agent.cited_sources)
    }] : [],
    shiftedStances: [],
    unresolvedStances: agents
      .filter(agent => agent.error || agent.signal_label === 'Conflicted')
      .map(agent => ({
        agent: agent.agent_name,
        stance: agent.signal_label,
        evidence: agent.cited_sources
      })),
    transcript: agents.map(agent => ({
      speaker: agent.agent_name,
      stance: agent.stance,
      point: agent.reasoning,
      evidence: agent.cited_sources
    }))
  };
}