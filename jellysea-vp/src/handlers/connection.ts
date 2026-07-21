import { WebSocket } from 'ws'
import { v4 as uuid } from 'uuid'
import type { SignalMessage } from '../types'
import {
  createRoom,
  getRoom,
  addPeerToRoom,
  removePeerFromRoom,
  getRoomPeers,
  registerConnection,
  unregisterConnection,
  getConnection,
} from '../store/roomStore'
import { handleSignaling } from './signaling'

export function handleConnection(ws: WebSocket): void {
  const peerId = uuid()
  let roomId: string | null = null
  let displayName = 'Anonymous'

  registerConnection({
    ws,
    peerId,
    roomId: null,
    userInfo: { id: peerId, displayName },
    isAlive: true,
  })

  ws.send(JSON.stringify({
    type: 'peer-id',
    roomId: '',
    payload: { peerId },
    senderId: 'server',
  }))

  ws.on('pong', () => {
    const conn = getConnection(peerId)
    if (conn) conn.isAlive = true
  })

  ws.on('message', (raw) => {
    let msg: SignalMessage
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      ws.send(JSON.stringify({
        type: 'error',
        roomId: '',
        payload: { message: 'Invalid JSON' },
        senderId: 'server',
      }))
      return
    }

    msg.senderId = peerId

    if (msg.type === 'set-user-info') {
      const info = msg.payload as { displayName?: string; avatar?: string }
      const conn = getConnection(peerId)
      if (conn) {
        conn.userInfo = {
          id: peerId,
          displayName: info.displayName || 'Anonymous',
          avatar: info.avatar,
        }
        displayName = conn.userInfo.displayName
      }
      return
    }

    if (msg.type === 'create-room') {
      const newRoomId = msg.payload && typeof msg.payload === 'object' && 'roomId' in msg.payload
        ? (msg.payload as { roomId: string }).roomId
        : uuid().slice(0, 8)

      const existing = getRoom(newRoomId)
      if (existing) {
        addPeerToRoom(newRoomId, getConnection(peerId)!)
        roomId = newRoomId
      } else {
        createRoom(newRoomId)
        addPeerToRoom(newRoomId, getConnection(peerId)!)
        roomId = newRoomId
      }

      ws.send(JSON.stringify({
        type: 'room-created',
        roomId: newRoomId,
        payload: { roomId: newRoomId },
        senderId: 'server',
      }))

      broadcastPeers(newRoomId)
      return
    }

    if (msg.type === 'join-room') {
      const targetRoomId = msg.roomId || (msg.payload as { roomId?: string })?.roomId
      if (!targetRoomId) {
        ws.send(JSON.stringify({
          type: 'error',
          roomId: '',
          payload: { message: 'Room ID is required to join' },
          senderId: 'server',
        }))
        return
      }

      const room = getRoom(targetRoomId)
      if (!room) {
        ws.send(JSON.stringify({
          type: 'error',
          roomId: targetRoomId,
          payload: { message: 'Room not found' },
          senderId: 'server',
        }))
        return
      }

      addPeerToRoom(targetRoomId, getConnection(peerId)!)
      roomId = targetRoomId

      ws.send(JSON.stringify({
        type: 'room-joined',
        roomId: targetRoomId,
        payload: { roomId: targetRoomId },
        senderId: 'server',
      }))

      broadcastPeers(targetRoomId)
      return
    }

    if (msg.type === 'leave-room') {
      if (roomId) {
        removePeerFromRoom(roomId, peerId)
        broadcastPeerLeft(roomId, peerId)
        broadcastPeers(roomId)
      }
      const conn = getConnection(peerId)
      if (conn) conn.roomId = null
      roomId = null
      return
    }

    handleSignaling(ws, msg)
  })

  ws.on('close', () => {
    if (roomId) {
      removePeerFromRoom(roomId, peerId)
      broadcastPeerLeft(roomId, peerId)
      broadcastPeers(roomId)
    }
    unregisterConnection(peerId)
  })

  ws.on('error', () => {
    if (roomId) {
      removePeerFromRoom(roomId, peerId)
      broadcastPeerLeft(roomId, peerId)
      broadcastPeers(roomId)
    }
    unregisterConnection(peerId)
  })
}

function broadcastPeers(roomId: string): void {
  const room = getRoom(roomId)
  if (!room) return

  const peerList = Array.from(room.peers.values()).map((p) => ({
    id: p.peerId,
    displayName: p.userInfo.displayName,
    avatar: p.userInfo.avatar,
  }))

  const msg = JSON.stringify({
    type: 'room-state',
    roomId,
    payload: { roomId, peers: peerList },
    senderId: 'server',
  })

  for (const [, peer] of room.peers) {
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(msg)
    }
  }
}

function broadcastPeerLeft(roomId: string, leftPeerId: string): void {
  const room = getRoom(roomId)
  if (!room) return

  const msg = JSON.stringify({
    type: 'peer-left',
    roomId,
    payload: { peerId: leftPeerId },
    senderId: 'server',
  })

  for (const [, peer] of room.peers) {
    if (peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(msg)
    }
  }
}
