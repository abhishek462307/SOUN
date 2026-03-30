import { Action } from '../models/action';
import { NormalizedResponse } from '../models/response';
import { registry as defaultRegistry, Registry } from './registry';
import { loggingSystem } from './logging-system';
import { agentRegistry } from './agent-registry';
import { paymentSystem } from './payment-system';
import axios from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv);

export class ExecutionEngine {
  private registry: Registry;

  constructor(registry: Registry = defaultRegistry) {
    this.registry = registry;
  }

  public async execute(
    action_id: string, 
    input: any, 
    intentText?: string, 
    options: { retries?: number; fallback?: boolean; agent_id?: string } = { retries: 1, fallback: true }
  ): Promise<NormalizedResponse> {
    const startTime = Date.now();
    const action = this.registry.getAction(action_id);
    const agentId = options.agent_id || 'anonymous';

    if (!action) {
      // 3.11.3b Check if it's a proxied action
      // In a real system, we'd store peer action metadata. 
      // For now, if action_id starts with a peer prefix or we have peer info in the request, we proxy.
      return this.normalizeError('Action not found', 'failure');
    }

    // Check for proxying
    const peerUrl = (input as any).peer_url || action.peer_url;
    if (peerUrl) {
      console.log(`[Execution Engine] Proxying execution to peer: ${peerUrl}`);
      try {
        const response = await axios.post(`${peerUrl}/api/execute/${action_id}`, input, { timeout: 10000 });
        return response.data;
      } catch (err: any) {
        return this.normalizeError(`Proxy execution failed: ${err.message}`, 'failure');
      }
    }

    let attempts = 0;
    const maxAttempts = (options.retries || 0) + 1;
    let lastError: any;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        // 3.11.2 Input Validation
        this.validateInput(action, input);

        // 3.11.2.1 Payment Processing (New)
        if (agentId !== 'anonymous' && action.cost && action.cost > 0) {
          const paid = await paymentSystem.processExecutionPayment(agentId, action.provider, action_id, action.cost);
          if (!paid) throw new Error(`Insufficient funds: Action requires ${action.cost} SOUN`);
        }

        // 3.11.3 Routing Logic & 3.11.4 Execution
        let result;
        if (action.type === 'internal' && action.handler) {
          result = await action.handler(input);
        } else if (action.type === 'external' && action.execution_url) {
          const response = await axios.post(action.execution_url, input, { timeout: 5000 });
          result = response.data;
        } else {
          throw new Error('Action handler or execution URL not defined');
        }

        // 3.11.5 Response Normalization
        const normalizedResponse = this.normalizeResponse(result);
        
        // Update trust on success
        await this.registry.updateActionTrust(action_id, 1);
        if (agentId !== 'anonymous') {
          await agentRegistry.updateStats(agentId, true);
        }
        
        this.logExecution(action, normalizedResponse, Date.now() - startTime, intentText, agentId);
        return normalizedResponse;

      } catch (error: any) {
        lastError = error;
        console.warn(`[Execution Engine] Attempt ${attempts}/${maxAttempts} failed for action ${action_id}: ${error.message}`);
        
        // 3.11.6 Error Handling
        if (attempts >= maxAttempts) {
          // Update trust on final failure
          await this.registry.updateActionTrust(action_id, -1);
          if (agentId !== 'anonymous') {
            await agentRegistry.updateStats(agentId, false);
          }

          // 3.11.7 Fallback Strategy
           if (options.fallback && intentText) {
             console.log(`[Execution Engine] Attempting fallback for intent: "${intentText}"`);
             const alternatives = await this.registry.search({ intent: intentText });
             const nextBest = alternatives.find((alt: any) => alt.action_id !== action_id);
            
            if (nextBest) {
              console.log(`[Execution Engine] Falling back to alternative action: ${nextBest.action_id} (${nextBest.name})`);
              return this.execute(nextBest.action_id, input, intentText, { ...options, retries: 0, fallback: false });
            }
          }

          const message = lastError.message || 'Unknown error during execution';
          const normalizedResponse = this.normalizeError(message, 'failure');
          this.logExecution(action, normalizedResponse, Date.now() - startTime, intentText, agentId);
          return normalizedResponse;
        }
        
        // Optional: wait before retry
        await new Promise(resolve => setTimeout(resolve, 500 * attempts));
      }
    }

    return this.normalizeError('Max retries reached', 'failure');
  }

  private validateInput(action: Action, input: any): void {
    if (!input) throw new Error('Input is required');
    
    if (action.parameters) {
      const validate = ajv.compile(action.parameters);
      const valid = validate(input);
      if (!valid) {
        const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
        throw new Error(`Input validation failed: ${errors}`);
      }
    }
  }

  private normalizeResponse(data: any): NormalizedResponse {
    return {
      status: 'success',
      data: data,
      message: 'Action completed'
    };
  }

  private normalizeError(message: string, status: 'failure' | 'partial'): NormalizedResponse {
    return {
      status,
      data: null,
      message
    };
  }

  private logExecution(action: Action, response: NormalizedResponse, latencyMs: number, intentText?: string, agentId?: string): void {
    loggingSystem.log({
      intent: intentText,
      action_id: action.action_id,
      agent_id: agentId,
      name: action.name,
      provider: action.provider,
      status: response.status === 'success' ? 'success' : 'failure',
      latency_ms: latencyMs,
      timestamp: new Date().toISOString()
    });
  }
}

export const executionEngine = new ExecutionEngine();
