import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
}

export class JsonFileStorage implements StorageProvider {
  private baseDir: string;
  private writeQueues: Map<string, Promise<void>> = new Map();

  constructor(baseDir: string = './data') {
    this.baseDir = baseDir;
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (err) {
      // Ignore
    }
  }

  public async save(key: string, data: any): Promise<void> {
    const currentQueue = this.writeQueues.get(key) || Promise.resolve();
    
    const newWrite = currentQueue.then(async () => {
      await this.ensureDir();
      const filePath = path.join(this.baseDir, `${key}.json`);
      const tempPath = `${filePath}.${Math.random().toString(36).substring(2, 10)}.tmp`;
      
      try {
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
        await fs.rename(tempPath, filePath);
      } catch (err) {
        try { await fs.unlink(tempPath); } catch (e) {}
        throw err;
      }
    });

    this.writeQueues.set(key, newWrite);
    return newWrite;
  }

  public async load(key: string): Promise<any> {
    await this.ensureDir();
    const filePath = path.join(this.baseDir, `${key}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }
}

export const storage = new JsonFileStorage();
