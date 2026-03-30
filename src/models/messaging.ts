export interface AgentMessage {
  id: string;
  from_did: string;
  to_did: string;
  subject: string;
  body: any;
  status: 'sent' | 'received' | 'processed' | 'failed';
  timestamp: number;
  reply_to?: string;
}

export interface SendMessageRequest {
  to_did: string;
  subject: string;
  body: any;
  reply_to?: string;
}
