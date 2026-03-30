import axios from 'axios';

export class RealWorldProvider {
  /**
   * Triggers a real-world webhook.
   * This is our first "Open Loop" action.
   */
  public async triggerWebhook(input: { url: string; payload: any }): Promise<any> {
    console.log(`[RealWorld Provider] Dispatching real execution to: ${input.url}`);
    
    try {
      const response = await axios.post(input.url, {
        soun_event: 'execution_triggered',
        timestamp: new Date().toISOString(),
        data: input.payload
      }, { timeout: 5000 });

      return {
        status: 'dispatched',
        remote_response: response.status,
        message: 'Real-world webhook triggered successfully.'
      };
    } catch (err: any) {
      throw new Error(`Real-world dispatch failed: ${err.message}`);
    }
  }
}

export const realWorldProvider = new RealWorldProvider();
