export interface Peer {
  id: string;
  url: string;
  status: 'online' | 'offline';
  last_seen: number;
  capabilities: string[];
}

export interface PeerJoinRequest {
  url: string;
  id: string;
  capabilities: string[];
}
