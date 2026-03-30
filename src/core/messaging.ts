import { AgentMessage, SendMessageRequest } from '../models/messaging';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { loggingSystem } from './logging-system';

export class MessagingProtocol {
  private inbox: Map<string, AgentMessage[]> = new Map();

  public async initialize(): Promise<void> {
    const savedMessages = await storage.load('messages');
    if (savedMessages && Array.isArray(savedMessages)) {
      savedMessages.forEach(msg => {
        const current = this.inbox.get(msg.to_did) || [];
        this.inbox.set(msg.to_did, [...current, msg]);
      });
    }
  }

  private async save(): Promise<void> {
    const allMessages = Array.from(this.inbox.values()).flat();
    await storage.save('messages', allMessages);
  }

  public async sendMessage(fromDid: string, req: SendMessageRequest): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: `msg_${uuidv4().substring(0, 12)}`,
      from_did: fromDid,
      to_did: req.to_did,
      subject: req.subject,
      body: req.body,
      status: 'sent',
      timestamp: Date.now(),
      reply_to: req.reply_to
    };

    const recipientInbox = this.inbox.get(req.to_did) || [];
    this.inbox.set(req.to_did, [...recipientInbox, message]);
    
    await this.save();
    console.log(`[Messaging] Agent ${fromDid} sent "${req.subject}" to ${req.to_did}`);
    return message;
  }

  public getInbox(did: string): AgentMessage[] {
    if (did === 'all') {
      return Array.from(this.inbox.values()).flat();
    }
    return this.inbox.get(did) || [];
  }

  public async markAsProcessed(did: string, msgId: string): Promise<void> {
    const messages = this.inbox.get(did);
    if (messages) {
      const msg = messages.find(m => m.id === msgId);
      if (msg) {
        msg.status = 'processed';
        await this.save();
      }
    }
  }
}

export const messagingProtocol = new MessagingProtocol();
