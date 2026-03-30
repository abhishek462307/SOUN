export class AuthService {
  private apiKeys: Map<string, string> = new Map([
    ['soun_admin_key', 'system_admin'],
    ['test_agent_key', 'did:soun:test_agent']
  ]);

  public isValid(key: string): boolean {
    return this.apiKeys.has(key);
  }

  public getAgentId(key: string): string | undefined {
    return this.apiKeys.get(key);
  }

  public generateKey(agentId: string): string {
    const newKey = `soun_${Math.random().toString(36).substring(2, 15)}`;
    this.apiKeys.set(newKey, agentId);
    return newKey;
  }
}

export const authService = new AuthService();
