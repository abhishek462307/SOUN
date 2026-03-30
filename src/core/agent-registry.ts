import { AgentIdentity, RegisterAgentRequest } from '../models/agent';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';

export class AgentRegistry {
  private agents: Map<string, AgentIdentity> = new Map();

  public async initialize(): Promise<void> {
    const savedAgents = await storage.load('agents');
    if (savedAgents && Array.isArray(savedAgents)) {
      savedAgents.forEach(agent => this.agents.set(agent.agent_id, agent));
    }
  }

  private async save(): Promise<void> {
    await storage.save('agents', Array.from(this.agents.values()));
  }

  public async register(req: RegisterAgentRequest): Promise<AgentIdentity> {
    const agent_id = `did:soun:${uuidv4().substring(0, 12)}`;
    const newAgent: AgentIdentity = {
      agent_id,
      name: req.name,
      organization: req.organization,
      public_key: req.public_key,
      status: 'active',
      trust_score: 0.5,
      total_executions: 0,
      success_rate: 0,
      created_at: Date.now(),
      last_active: Date.now()
    };
    this.agents.set(agent_id, newAgent);
    await this.save();
    return newAgent;
  }

  public getAgent(agent_id: string): AgentIdentity | undefined {
    return this.agents.get(agent_id);
  }

  public async updateStats(agent_id: string, success: boolean): Promise<void> {
    const agent = this.agents.get(agent_id);
    if (agent) {
      agent.total_executions++;
      agent.last_active = Date.now();
      
      const successCount = agent.success_rate * (agent.total_executions - 1) + (success ? 1 : 0);
      agent.success_rate = successCount / agent.total_executions;
      
      // trust_score updates similar to providers
      const delta = success ? 0.05 : -0.1;
      agent.trust_score = Math.max(0, Math.min(1, agent.trust_score + delta));
      
      await this.save();
    }
  }

  public getAllAgents(): AgentIdentity[] {
    return Array.from(this.agents.values());
  }
}

export const agentRegistry = new AgentRegistry();
