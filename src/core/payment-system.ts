import { Wallet, Transaction } from '../models/payment';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { loggingSystem } from './logging-system';
import { blockchain } from './blockchain';
import { TransactionData } from '../models/blockchain';

export class PaymentSystem {
  // We keep a local cache of wallets but balances are derived from the blockchain
  private wallets: Map<string, Wallet> = new Map();

  public async initialize(): Promise<void> {
    await blockchain.initialize();
    const savedWallets = await storage.load('wallets');
    if (savedWallets && Array.isArray(savedWallets)) {
      savedWallets.forEach(wallet => this.wallets.set(wallet.id, wallet));
    }
  }

  private async save(): Promise<void> {
    await storage.save('wallets', Array.from(this.wallets.values()));
  }

  public async getOrCreateWallet(id: string): Promise<Wallet> {
    // We provide initial 1000 credits via a system transaction if the wallet doesn't exist
    let wallet = this.wallets.get(id);
    if (!wallet) {
      console.log(`[Payment] Creating new blockchain wallet for: ${id}`);
      
      // Add initial credit transaction to blockchain
      const initialCredit: TransactionData = {
        from: 'GENESIS_REWARD',
        to: id,
        amount: 1000,
        currency: 'SOUN',
        type: 'deposit',
        timestamp: Date.now()
      };
      await blockchain.addTransaction(initialCredit);
      
      wallet = {
        id,
        balance: 1000, // This will be verified via blockchain.getBalance(id)
        currency: 'SOUN',
        transactions: []
      };
      this.wallets.set(id, wallet);
      await this.save();
    }
    
    // Always sync balance with blockchain
    wallet.balance = blockchain.getBalance(id);
    
    // Sync transactions from blockchain
    wallet.transactions = this.getTransactionsFromBlockchain(id);
    
    return wallet;
  }

  private getTransactionsFromBlockchain(id: string): Transaction[] {
    const transactions: Transaction[] = [];
    // Confirmed
    for (const block of blockchain.getChain()) {
      for (const t of block.transactions) {
        if (t.from === id || t.to === id) {
          transactions.push({
            id: `tx_block_${block.index}_${t.timestamp}`,
            from: t.from,
            to: t.to,
            amount: t.amount,
            currency: t.currency || 'SOUN',
            type: t.type as any,
            status: 'completed',
            action_id: t.action_id,
            timestamp: t.timestamp
          });
        }
      }
    }
    // Pending
    for (const t of blockchain.getPendingTransactions()) {
      if (t.from === id || t.to === id) {
        transactions.push({
          id: `tx_pending_${t.timestamp}`,
          from: t.from,
          to: t.to,
          amount: t.amount,
          currency: t.currency || 'SOUN',
          type: t.type as any,
          status: 'pending',
          action_id: t.action_id,
          timestamp: t.timestamp
        });
      }
    }
    return transactions;
  }

  public async processExecutionPayment(agentId: string, providerId: string, actionId: string, amount: number): Promise<boolean> {
    // Ensure wallet exists (and has initial credits if new)
    this.getOrCreateWallet(agentId);
    
    const agentBalance = blockchain.getBalance(agentId);

    if (agentBalance < amount) {
      loggingSystem.error(`Insufficient blockchain balance for agent ${agentId}. Needed ${amount}, has ${agentBalance}`);
      return false;
    }

    const transaction: TransactionData = {
      from: agentId,
      to: providerId,
      amount,
      currency: 'SOUN',
      type: 'execution_fee',
      action_id: actionId,
      timestamp: Date.now()
    };

    // Add to blockchain
    blockchain.addTransaction(transaction);
    
    // Automatically mine the block for this demo (this makes it "final")
    await blockchain.minePendingTransactions('NODE_OPERATOR_REWARD');

    console.log(`[Blockchain Payment] Execution Fee: ${amount} SOUN from ${agentId} to ${providerId} (Block Mined)`);
    return true;
  }

  public async deposit(agentId: string, amount: number, currency: string = 'USDC'): Promise<void> {
    const transaction: TransactionData = {
      from: 'EXTERNAL_WALLET',
      to: agentId,
      amount,
      currency,
      type: 'deposit',
      timestamp: Date.now()
    };
    blockchain.addTransaction(transaction);
    await blockchain.minePendingTransactions('NODE_OPERATOR_REWARD');
    await this.save();
  }

  public getAllWallets(): Wallet[] {
    // Ensure all wallets have up-to-date balances
    for (const id of this.wallets.keys()) {
      this.getOrCreateWallet(id);
    }
    return Array.from(this.wallets.values());
  }
}

export const paymentSystem = new PaymentSystem();
