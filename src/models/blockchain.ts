export interface TransactionData {
  from: string;
  to: string;
  amount: number;
  currency: string; // Added for multi-currency support
  type: string;
  action_id?: string;
  timestamp: number;
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: TransactionData[];
  previousHash: string;
  hash: string;
  nonce: number;
}

export interface BlockchainState {
  chain: Block[];
  pendingTransactions: TransactionData[];
  difficulty: number;
}
