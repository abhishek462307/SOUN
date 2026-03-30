import * as crypto from 'crypto';
import { Block, TransactionData, BlockchainState } from '../models/blockchain';
import { storage } from './storage';

export class Blockchain {
  private chain: Block[] = [];
  private pendingTransactions: TransactionData[] = [];
  private difficulty: number = 2; // PoW difficulty

  constructor() {}

  public async initialize(): Promise<void> {
    const savedState: BlockchainState = await storage.load('blockchain');
    if (savedState) {
      this.chain = savedState.chain;
      this.pendingTransactions = savedState.pendingTransactions;
      this.difficulty = savedState.difficulty;
    } else {
      this.createGenesisBlock();
      await this.save();
    }
  }

  private async save(): Promise<void> {
    const state: BlockchainState = {
      chain: this.chain,
      pendingTransactions: this.pendingTransactions,
      difficulty: this.difficulty
    };
    await storage.save('blockchain', state);
  }

  private createGenesisBlock(): void {
    const genesisBlock: Block = {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: '0',
      hash: this.calculateHash(0, '0', Date.now(), [], 0),
      nonce: 0
    };
    this.chain.push(genesisBlock);
  }

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  public calculateHash(index: number, previousHash: string, timestamp: number, transactions: TransactionData[], nonce: number): string {
    const data = index + previousHash + timestamp + JSON.stringify(transactions) + nonce;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  public addTransaction(transaction: TransactionData): void {
    this.pendingTransactions.push(transaction);
    this.save();
  }

  public async minePendingTransactions(minerRewardAddress: string): Promise<Block> {
    const previousBlock = this.getLatestBlock();
    const newBlock: Block = {
      index: previousBlock.index + 1,
      timestamp: Date.now(),
      transactions: [...this.pendingTransactions],
      previousHash: previousBlock.hash,
      hash: '',
      nonce: 0
    };

    // Simple Proof of Work
    while (!newBlock.hash.startsWith('0'.repeat(this.difficulty))) {
      newBlock.nonce++;
      newBlock.hash = this.calculateHash(
        newBlock.index,
        newBlock.previousHash,
        newBlock.timestamp,
        newBlock.transactions,
        newBlock.nonce
      );
    }

    console.log(`[Blockchain] Block mined! Hash: ${newBlock.hash}`);
    this.chain.push(newBlock);
    
    // Reset pending transactions and add miner reward
    this.pendingTransactions = [
      {
        from: 'SYSTEM',
        to: minerRewardAddress,
        amount: 5, // Reward for mining
        currency: 'SOUN',
        type: 'miner_reward',
        timestamp: Date.now()
      }
    ];
    
    await this.save();
    return newBlock;
  }

  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== this.calculateHash(currentBlock.index, currentBlock.previousHash, currentBlock.timestamp, currentBlock.transactions, currentBlock.nonce)) {
        return false;
      }
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  public getChain(): Block[] {
    return this.chain;
  }

  public getPendingTransactions(): TransactionData[] {
    return this.pendingTransactions;
  }

  public getBalance(address: string, currency: string = 'SOUN'): number {
    let balance = 0;
    // Check confirmed chain
    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.currency === currency) {
          if (trans.from === address) {
            balance -= trans.amount;
          }
          if (trans.to === address) {
            balance += trans.amount;
          }
        }
      }
    }
    // Check pending transactions
    for (const trans of this.pendingTransactions) {
      if (trans.currency === currency) {
        if (trans.from === address) {
          balance -= trans.amount;
        }
        if (trans.to === address) {
          balance += trans.amount;
        }
      }
    }
    return balance;
  }
}

export const blockchain = new Blockchain();
