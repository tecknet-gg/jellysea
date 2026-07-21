export interface SignalMessage {
  type: SignalType
  roomId: string
  payload: unknown
  senderId: string
  targetId?: string
}

export type SignalType =
  | 'peer-id'
  | 'set-user-info'
  | 'create-room'
  | 'room-created'
  | 'join-room'
  | 'room-joined'
  | 'leave-room'
  | 'kick-member'
  | 'kicked'
  | 'party-ended'
  | 'media-start'
  | 'sync-ping'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'chat'
  | 'room-state'
  | 'peer-joined'
  | 'peer-left'
  | 'error'

export interface RoomStatePayload {
  roomId: string
  peers: PeerInfo[]
}

export interface PeerInfo {
  id: string
  displayName: string
  avatar?: string
  userId?: string
}

import type { WebSocket } from 'ws'

export interface ClientConnection {
  ws: WebSocket
  peerId: string
  roomId: string | null
  userInfo: PeerInfo
  isAlive: boolean
}

export interface Room {
  id: string
  peers: Map<string, ClientConnection>
  createdAt: number
}
