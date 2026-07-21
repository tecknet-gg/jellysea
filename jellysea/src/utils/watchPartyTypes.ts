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
  | 'peer-joined'
  | 'peer-left'
  | 'room-state'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'chat'
  | 'error'

export interface PeerInfo {
  id: string
  displayName: string
  avatar?: string
}

export interface RoomState {
  roomId: string
  peers: PeerInfo[]
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
  system?: boolean
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected'
