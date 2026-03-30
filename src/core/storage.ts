import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
}

export class JsonFileStorage implements StorageProvider {
  private baseDir: string;

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
    await this.ensureDir();
    const filePath = path.join(this.baseDir, `${key}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
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
