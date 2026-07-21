import { WebSocket } from 'ws'
import type { SignalMessage } from '../types'
import { getConnection, getRoomPeers, getRoom } from '../store/roomStore'

export function handleSignaling(ws: WebSocket, msg: SignalMessage): void {
  const { type, roomId, targetId } = msg

  if (type === 'offer' || type === 'answer' || type === 'ice-candidate') {
    if (!targetId) return

    const targetConn = getConnection(targetId)
    if (!targetConn || targetConn.ws.readyState !== WebSocket.OPEN) return

    targetConn.ws.send(JSON.stringify({
      type,
      roomId,
      payload: msg.payload,
      senderId: msg.senderId,
    }))
    return
  }

  if (type === 'chat' || type === 'media-start' || type === 'sync-ping') {
    const peers = getRoomPeers(roomId)
    for (const peer of peers) {
      if (peer.peerId !== msg.senderId && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({
          type: 'chat',
          roomId,
          payload: msg.payload,
          senderId: msg.senderId,
        }))
      }
    }
    return
  }

  if (type === 'room-state') {
    const room = getRoom(roomId)
    if (!room) return
    const senderConn = getConnection(msg.senderId)
    if (!senderConn) return

    const peerList = Array.from(room.peers.values()).map((p) => ({
      id: p.peerId,
      displayName: p.userInfo.displayName,
      avatar: p.userInfo.avatar,
    }))

    if (senderConn.ws.readyState === WebSocket.OPEN) {
      senderConn.ws.send(JSON.stringify({
        type: 'room-state',
        roomId,
        payload: { roomId, peers: peerList },
        senderId: 'server',
      }))
    }
  }
}
