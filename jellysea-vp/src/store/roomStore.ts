import type { ClientConnection, Room } from '../types'

const rooms = new Map<string, Room>()
const connections = new Map<string, ClientConnection>()

export function createRoom(roomId: string): Room {
  const room: Room = {
    id: roomId,
    peers: new Map(),
    createdAt: Date.now(),
  }
  rooms.set(roomId, room)
  return room
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId)
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId)
}

export function addPeerToRoom(roomId: string, conn: ClientConnection): void {
  const room = rooms.get(roomId)
  if (!room) return
  room.peers.set(conn.peerId, conn)
  conn.roomId = roomId
}

export function removePeerFromRoom(roomId: string, peerId: string): void {
  const room = rooms.get(roomId)
  if (!room) return
  room.peers.delete(peerId)
  if (room.peers.size === 0) {
    rooms.delete(roomId)
  }
}

export function getRoomPeers(roomId: string): ClientConnection[] {
  const room = rooms.get(roomId)
  if (!room) return []
  return Array.from(room.peers.values())
}

export function registerConnection(conn: ClientConnection): void {
  connections.set(conn.peerId, conn)
}

export function unregisterConnection(peerId: string): void {
  connections.delete(peerId)
}

export function getConnection(peerId: string): ClientConnection | undefined {
  return connections.get(peerId)
}

export function getRoomCount(): number {
  return rooms.size
}

export function getConnectionCount(): number {
  return connections.size
}
