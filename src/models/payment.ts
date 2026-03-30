export interface Transaction {
  id: string;
  from: string; // Agent ID or Node ID
  to: string;   // Provider or Node ID
  amount: number;
  currency: string;
  type: 'execution_fee' | 'payout' | 'deposit';
  status: 'pending' | 'completed' | 'failed';
  action_id?: string;
  timestamp: number;
}

export interface Wallet {
  id: string; // Linked to Agent ID or Node ID
  balance: number;
  currency: string;
  transactions: Transaction[];
}
