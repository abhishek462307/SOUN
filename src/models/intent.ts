export interface Intent {
  intent: string;
  context?: Record<string, any>;
}

export interface SearchResponse {
  results: ActionSearchResult[];
}

export interface ActionSearchResult {
  action_id: string;
  name: string;
  provider: string;
  trust_score: number;
  latency: string;
  execution_url: string;
  description?: string;
  parameters?: Record<string, any>;
  returns?: Record<string, any>;
}
