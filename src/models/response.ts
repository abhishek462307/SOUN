export interface NormalizedResponse {
  status: 'success' | 'failure' | 'partial';
  data: any;
  message: string;
}

export interface ExecutionRequest {
  action_id: string;
  input: Record<string, any>;
}

export interface ExecutionEventLog {
  intent?: string;
  action_id: string;
  agent_id?: string;
  name: string;
  provider: string;
  status: 'success' | 'failure';
  latency_ms: number;
  timestamp: string;
}
