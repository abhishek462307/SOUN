import { AgentRegistry } from '../core/agent-registry';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  test('should register a new agent with a DID', async () => {
    const agent = await registry.register({
      name: 'Test Agent',
      organization: 'SOUN Labs'
    });

    expect(agent.agent_id).toContain('did:soun:');
    expect(agent.name).toBe('Test Agent');
    expect(registry.getAgent(agent.agent_id)).toBe(agent);
  });

  test('should update agent stats after execution', async () => {
    const agent = await registry.register({ name: 'Stat Agent' });
    
    await registry.updateStats(agent.agent_id, true); // Success
    expect(agent.total_executions).toBe(1);
    expect(agent.success_rate).toBe(1);
    expect(agent.trust_score).toBeGreaterThan(0.5);

    await registry.updateStats(agent.agent_id, false); // Failure
    expect(agent.total_executions).toBe(2);
    expect(agent.success_rate).toBe(0.5);
  });
});
