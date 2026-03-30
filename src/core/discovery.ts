export interface SystemManifest {
  protocol_version: string;
  system_name: string;
  description: string;
  endpoints: {
    search: string;
    execute: string;
    register: string;
    tools: string;
    metrics: string;
  };
  capabilities: string[];
}

export const SOUN_MANIFEST: SystemManifest = {
  protocol_version: '1.0.0',
  system_name: 'PROJECT SOUN',
  description: 'Universal Execution Protocol for AI Agents',
  endpoints: {
    search: '/api/search',
    execute: '/api/execute/:action_id',
    register: '/api/register-action',
    tools: '/api/tools',
    metrics: '/api/metrics'
  },
  capabilities: [
    'json-schema-validation',
    'trust-based-ranking',
    'external-api-routing',
    'ai-tool-export'
  ]
};
