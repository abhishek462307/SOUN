import axios from 'axios';
import { registry } from './registry';
import { loggingSystem } from './logging-system';

export interface SounConfig {
  name: string;
  provider: string;
  description: string;
  actions: Array<{
    name: string;
    description: string;
    execution_url: string;
    parameters?: Record<string, any>;
    returns?: Record<string, any>;
  }>;
}

export class WebsiteCrawler {
  public async crawl(url: string): Promise<{ success: boolean; count: number; message: string }> {
    try {
      // Normalize URL to find soun.json
      const baseUrl = new URL(url).origin;
      const configUrl = `${baseUrl}/soun.json`;

      console.log(`[Crawler] Attempting to discover SOUN config at: ${configUrl}`);
      const response = await axios.get(configUrl, { timeout: 5000 });
      
      const config: SounConfig = response.data;
      if (!config.actions || !Array.isArray(config.actions)) {
        throw new Error('Invalid soun.json: actions array missing');
      }

      let registeredCount = 0;
      for (const actionData of config.actions) {
        await registry.register({
          name: actionData.name,
          provider: config.provider || config.name,
          execution_url: actionData.execution_url.startsWith('http') 
            ? actionData.execution_url 
            : `${baseUrl}${actionData.execution_url}`,
          description: actionData.description,
          parameters: actionData.parameters,
          returns: actionData.returns
        });
        registeredCount++;
      }

      const msg = `Successfully registered ${registeredCount} actions from ${baseUrl}`;
      console.log(`[Crawler] ${msg}`);
      return { success: true, count: registeredCount, message: msg };

    } catch (err: any) {
      const errorMsg = `Crawl failed for ${url}: ${err.message}`;
      loggingSystem.error(errorMsg);
      return { success: false, count: 0, message: errorMsg };
    }
  }
}

export const websiteCrawler = new WebsiteCrawler();
