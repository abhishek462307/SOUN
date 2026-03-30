import { Action } from '../models/action';
import { Intent, ActionSearchResult } from '../models/intent';
import { Peer } from '../models/peer';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import axios from 'axios';

export class Registry {
  private actions: Action[] = [];
  private peers: Peer[] = [];
  private nodeId: string = `node_${uuidv4().substring(0, 8)}`;

  constructor() {}

  public async initialize(): Promise<void> {
    const savedActions = await storage.load('actions');
    const savedPeers = await storage.load('peers');
    const savedNodeId = await storage.load('node_id');

    if (savedActions) this.actions = savedActions;
    if (savedPeers) this.peers = savedPeers;
    if (savedNodeId) this.nodeId = savedNodeId;
  }

  private async save(): Promise<void> {
    await storage.save('actions', this.actions);
    await storage.save('peers', this.peers);
    await storage.save('node_id', this.nodeId);
  }

  public async registerPeer(peer: Peer): Promise<void> {
    if (!this.peers.find(p => p.id === peer.id)) {
      this.peers.push(peer);
      console.log(`[Network Registry] Registered peer: ${peer.id} @ ${peer.url}`);
      await this.save();
    }
  }

  public getPeers(): Peer[] {
    return this.peers;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public async register(data: { 
    name: string; 
    provider: string; 
    execution_url?: string; 
    description?: string; 
    parameters?: Record<string, any>;
    returns?: Record<string, any>;
    cost?: number;
    handler?: (input: any) => Promise<any> 
  }): Promise<Action> {
    const action: Action = {
      action_id: `act_${uuidv4().substring(0, 8)}`,
      name: data.name,
      provider: data.provider,
      execution_url: data.execution_url,
      type: data.handler ? 'internal' : 'external',
      trust_score: 0.5, // Initial trust score
      success_count: 0,
      failure_count: 0,
      latency: 'low',
      description: data.description,
      parameters: data.parameters,
      returns: data.returns,
      cost: data.cost || 10, // Default cost 10 SOUN
      handler: data.handler
    };
    this.actions.push(action);
    await this.save();
    return action;
  }

  public getAction(action_id: string): Action | undefined {
    return this.actions.find(a => a.action_id === action_id);
  }

  public async search(intent: Intent, options: { searchPeers?: boolean } = { searchPeers: true }): Promise<ActionSearchResult[]> {
    // 3.5.1 Intent Normalization
    const normalizedIntent = this.normalizeIntent(intent.intent);

    // 3.5.2 Context Enrichment (Simplified)
    const enrichedContext = { ...intent.context };

    // 3.5.3 Candidate Retrieval (Local)
    const localCandidates = this.actions.filter(action => {
      const searchTarget = `${action.name} ${action.description || ''}`.toLowerCase().replace(/_/g, ' ');
      const query = normalizedIntent.toLowerCase().replace(/_/g, ' ');
      
      return searchTarget.includes(query) || 
             query.split(' ').some(word => word.length > 3 && searchTarget.includes(word));
    });

    // 3.5.3 Candidate Retrieval (Distributed)
    let peerResults: ActionSearchResult[] = [];
    if (options.searchPeers && this.peers.length > 0) {
      console.log(`[Distributed Search] Querying ${this.peers.length} peers for: "${intent.intent}"`);
      const peerQueries = this.peers.map(async peer => {
        try {
          const res = await axios.post(`${peer.url}/api/search`, { ...intent, searchPeers: false }, { timeout: 2000 });
          return res.data.results.map((r: ActionSearchResult) => ({
            ...r,
            peer_url: peer.url // Mark for proxying
          }));
        } catch (err: any) {
          console.warn(`[Distributed Search] Peer ${peer.id} failed: ${err.message}`);
          return [];
        }
      });
      const allPeerResults = await Promise.all(peerQueries);
      peerResults = allPeerResults.flat();
    }

    // Combine local and peer results
    const scoredResults = localCandidates.map(action => {
      const relevance = this.calculateRelevance(action, normalizedIntent);
      let trust = action.trust_score;
      if (action.last_execution) {
        const hoursSinceLast = (Date.now() - action.last_execution) / (1000 * 60 * 60);
        const decayFactor = Math.pow(0.99, hoursSinceLast);
        trust = action.trust_score * decayFactor;
      }
      const latencyScore = action.latency === 'low' ? 1.0 : (action.latency === 'medium' ? 0.5 : 0.2);
      const w1 = 0.4, w2 = 0.3, w3 = 0.2, w4 = 0.1;
      const score = (w1 * relevance) + (w2 * trust) + (w3 * 1.0) + (w4 * latencyScore);
      return { action, score };
    });

    const combinedResults: ActionSearchResult[] = [
      ...scoredResults
        .sort((a, b) => b.score - a.score)
        .map(item => ({
          action_id: item.action.action_id,
          name: item.action.name,
          provider: item.action.provider,
          trust_score: item.action.trust_score,
          latency: item.action.latency || 'low',
          execution_url: `/execute/${item.action.action_id}`,
          description: item.action.description,
          parameters: item.action.parameters,
          returns: item.action.returns
        })),
      ...peerResults
    ];

    return combinedResults;
  }

  private normalizeIntent(text: string): string {
    // Simplified normalization: synonyms map
    const synonyms: Record<string, string> = {
      'get me a ride': 'book_cab',
      'book a cab': 'book_cab',
      'order food': 'order_food',
      'get food': 'order_food'
    };

    for (const [key, val] of Object.entries(synonyms)) {
      if (text.toLowerCase().includes(key)) return val;
    }
    return text;
  }

  private calculateRelevance(action: Action, intent: string): number {
    if (action.name.toLowerCase() === intent.toLowerCase()) return 1.0;
    if (action.name.toLowerCase().includes(intent.toLowerCase())) return 0.8;
    return 0.5;
  }

  public async updateActionTrust(action_id: string, delta: number): Promise<void> {
    const action = this.getAction(action_id);
    if (action) {
      action.last_execution = Date.now();
      if (delta > 0) action.success_count++;
      else action.failure_count++;
      
      // trust_score = success_count / (success_count + failure_count)
      const total = action.success_count + action.failure_count;
      action.trust_score = total > 0 ? action.success_count / total : 0.5;
      await this.save();
    }
  }

  public getActionsAsTools(): any[] {
    return this.actions.map(action => ({
      type: 'function',
      function: {
        name: action.name,
        description: action.description || `Action provided by ${action.provider}`,
        parameters: action.parameters || {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }));
  }

  public getAllActions(): Action[] {
    return this.actions;
  }
}

export const registry = new Registry();
