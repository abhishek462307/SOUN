export interface Action {
  action_id: string;
  name: string;
  provider: string;
  execution_url?: string;
  type: 'internal' | 'external';
  trust_score: number;
  success_count: number;
  failure_count: number;
  latency?: 'low' | 'medium' | 'high';
  description?: string;
  parameters?: Record<string, any>; // JSON Schema for inputs
  returns?: Record<string, any>; // JSON Schema for outputs
  handler?: (input: any) => Promise<any>; // For internal actions
  last_execution?: number;
  peer_url?: string; // If this action is proxied from a peer
  cost?: number;     // Cost in SOUN units
}

export interface RegisterActionRequest {
  name: string;
  provider: string;
  execution_url?: string;
  description?: string;
  parameters?: Record<string, any>;
  returns?: Record<string, any>;
  cost?: number;
}
