export interface AgentIdentity {
  agent_id: string; // DID format: did:soun:agent_uuid
  name: string;
  organization?: string;
  public_key?: string; // For verifiable signatures in the future
  status: 'active' | 'suspended';
  trust_score: number;
  total_executions: number;
  success_rate: number;
  created_at: number;
  last_active: number;
}

export interface RegisterAgentRequest {
  name: string;
  organization?: string;
  public_key?: string;
}
