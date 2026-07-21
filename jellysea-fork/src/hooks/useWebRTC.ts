import { useRef, useState, useCallback, useEffect } from 'react'
import type {
  PeerInfo,
  ChatMessage,
  ConnectionState,
  SignalMessage,
} from '@app/utils/watchPartyTypes'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const SIGNALING_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SIGNALING_URL
    ? process.env.NEXT_PUBLIC_SIGNALING_URL
    : 'wss://test.tecknet.dev/vp'

interface UseWebRTCOptions {
  userInfo: { displayName: string; avatar?: string }
  signalingUrl?: string
  onChatMessage?: (msg: ChatMessage) => void
}

interface Peer {
  id: string
  displayName: string
  avatar?: string
  connectionState: RTCPeerConnectionState
  dcState: RTCDataChannelState
}

export function useWebRTC({
  userInfo,
  signalingUrl,
  onChatMessage,
}: UseWebRTCOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [peers, setPeers] = useState<Peer[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [myPeerId, setMyPeerId] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pcMap = useRef<Map<string, RTCPeerConnection>>(new Map())
  const dcMap = useRef<Map<string, RTCDataChannel>>(new Map())
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempts = useRef(0)
  const roomPeers = useRef<PeerInfo[]>([])

  const url = signalingUrl || SIGNALING_URL

  const updatePeerStates = useCallback(() => {
    const updated: Peer[] = []
    for (const p of roomPeers.current) {
      if (p.id === myPeerId) continue
      const pc = pcMap.current.get(p.id)
      const dc = dcMap.current.get(p.id)
      updated.push({
        id: p.id,
        displayName: p.displayName,
        avatar: p.avatar,
        connectionState: pc?.connectionState || 'new',
        dcState: dc?.readyState || 'closed',
      })
    }
    setPeers(updated)
  }, [myPeerId])

  const connectSignaling = useCallback(() => {
    const ws = new WebSocket(url)
    wsRef.current = ws
    setConnectionState('connecting')

    ws.onopen = () => {
      setConnectionState('connected')
      reconnectAttempts.current = 0
      ws.send(JSON.stringify({
        type: 'set-user-info',
        roomId: '',
        payload: { displayName: userInfo.displayName, avatar: userInfo.avatar },
        senderId: '',
      }))
    }

    ws.onmessage = (event) => {
      const msg: SignalMessage = JSON.parse(event.data)

      if (msg.type === 'peer-id') {
        setMyPeerId((msg.payload as { peerId: string }).peerId)
      }

      if (msg.type === 'room-created' || msg.type === 'room-joined') {
        setRoomId((msg.payload as { roomId: string }).roomId)
      }

      if (msg.type === 'room-state') {
        const state = msg.payload as { roomId: string; peers: PeerInfo[] }
        roomPeers.current = state.peers
        const otherPeers = state.peers.filter((p) => p.id !== myPeerId)

        for (const p of otherPeers) {
          if (!pcMap.current.has(p.id)) {
            createPeerConnection(p.id)
          }
        }
        updatePeerStates()
      }

      if (msg.type === 'peer-left') {
        const leftPeerId = (msg.payload as { peerId: string }).peerId
        closePeerConnection(leftPeerId)
        roomPeers.current = roomPeers.current.filter((p) => p.id !== leftPeerId)
        updatePeerStates()
      }

      if (msg.type === 'offer') {
        handleOffer(msg.senderId, msg.payload as RTCSessionDescriptionInit)
      }

      if (msg.type === 'answer') {
        handleAnswer(msg.senderId, msg.payload as RTCSessionDescriptionInit)
      }

      if (msg.type === 'ice-candidate') {
        handleIceCandidate(msg.senderId, msg.payload as RTCIceCandidateInit)
      }

      if (msg.type === 'chat') {
        const chatPayload = msg.payload as { text: string; senderName: string }
        const chatMsg: ChatMessage = {
          id: crypto.randomUUID(),
          senderId: msg.senderId,
          senderName: chatPayload.senderName,
          text: chatPayload.text,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, chatMsg])
        onChatMessage?.(chatMsg)
      }

      if (msg.type === 'error') {
        setError((msg.payload as { message: string }).message)
      }
    }

    ws.onclose = () => {
      setConnectionState('disconnected')
      if (reconnectAttempts.current < 5) {
        reconnectAttempts.current++
        reconnectTimer.current = setTimeout(connectSignaling, 2000 * reconnectAttempts.current)
      }
    }

    ws.onerror = () => {
      setConnectionState('disconnected')
    }
  }, [url, userInfo, myPeerId, updatePeerStates, onChatMessage])

  const createPeerConnection = useCallback((targetId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcMap.current.set(targetId, pc)

    const dc = pc.createDataChannel('jellysea-vp', { ordered: true })
    dcMap.current.set(targetId, dc)

    setupDataChannel(dc, targetId)

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          roomId: roomId || '',
          payload: event.candidate.toJSON(),
          senderId: myPeerId || '',
          targetId,
        }))
      }
    }

    pc.onconnectionstatechange = () => {
      updatePeerStates()
    }

    pc.ondatachannel = (event) => {
      dcMap.current.set(targetId, event.channel)
      setupDataChannel(event.channel, targetId)
    }

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && pc.localDescription) {
          wsRef.current.send(JSON.stringify({
            type: 'offer',
            roomId: roomId || '',
            payload: pc.localDescription,
            senderId: myPeerId || '',
            targetId,
          }))
        }
      })
      .catch((err) => {
        setError(`Failed to create offer: ${err.message}`)
      })

    return pc
  }, [roomId, myPeerId, updatePeerStates])

  const setupDataChannel = useCallback((dc: RTCDataChannel, peerId: string) => {
    dc.onopen = () => { updatePeerStates() }
    dc.onclose = () => { updatePeerStates() }
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'chat') {
          const chatMsg: ChatMessage = {
            id: crypto.randomUUID(),
            senderId: peerId,
            senderName: data.senderName || 'Unknown',
            text: data.text,
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, chatMsg])
          onChatMessage?.(chatMsg)
        }
      } catch { /* ignore */ }
    }
  }, [updatePeerStates, onChatMessage])

  const handleOffer = useCallback(async (senderId: string, offer: RTCSessionDescriptionInit) => {
    let pc = pcMap.current.get(senderId)
    if (!pc) {
      pc = new RTCPeerConnection(ICE_SERVERS)
      pcMap.current.set(senderId, pc)

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            roomId: roomId || '',
            payload: event.candidate.toJSON(),
            senderId: myPeerId || '',
            targetId: senderId,
          }))
        }
      }

      pc.onconnectionstatechange = () => { updatePeerStates() }

      pc.ondatachannel = (event) => {
        dcMap.current.set(senderId, event.channel)
        setupDataChannel(event.channel, senderId)
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        roomId: roomId || '',
        payload: answer,
        senderId: myPeerId || '',
        targetId: senderId,
      }))
    }
  }, [roomId, myPeerId, updatePeerStates, setupDataChannel])

  const handleAnswer = useCallback(async (senderId: string, answer: RTCSessionDescriptionInit) => {
    const pc = pcMap.current.get(senderId)
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }, [])

  const handleIceCandidate = useCallback(async (senderId: string, candidate: RTCIceCandidateInit) => {
    const pc = pcMap.current.get(senderId)
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch { /* ignore invalid candidates */ }
    }
  }, [])

  const closePeerConnection = useCallback((peerId: string) => {
    const dc = dcMap.current.get(peerId)
    if (dc) { dc.close(); dcMap.current.delete(peerId) }
    const pc = pcMap.current.get(peerId)
    if (pc) { pc.close(); pcMap.current.delete(peerId) }
  }, [])

  const createRoom = useCallback(async (customRoomId?: string): Promise<string> => {
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        const msg: SignalMessage = JSON.parse(event.data)
        if (msg.type === 'room-created') {
          wsRef.current?.removeEventListener('message', handler)
          resolve((msg.payload as { roomId: string }).roomId)
        }
      }
      wsRef.current?.addEventListener('message', handler)
      wsRef.current?.send(JSON.stringify({
        type: 'create-room',
        roomId: '',
        payload: customRoomId ? { roomId: customRoomId } : {},
        senderId: '',
      }))
    })
  }, [])

  const joinRoom = useCallback(async (targetRoomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        const msg: SignalMessage = JSON.parse(event.data)
        if (msg.type === 'room-joined') {
          wsRef.current?.removeEventListener('message', handler)
          resolve()
        }
        if (msg.type === 'error') {
          wsRef.current?.removeEventListener('message', handler)
          reject(new Error((msg.payload as { message: string }).message))
        }
      }
      wsRef.current?.addEventListener('message', handler)
      wsRef.current?.send(JSON.stringify({
        type: 'join-room',
        roomId: targetRoomId,
        payload: { roomId: targetRoomId },
        senderId: '',
      }))
    })
  }, [])

  const leaveRoom = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && roomId) {
      wsRef.current.send(JSON.stringify({
        type: 'leave-room',
        roomId,
        payload: {},
        senderId: '',
      }))
    }
    for (const [id] of pcMap.current) {
      closePeerConnection(id)
    }
    setRoomId(null)
    setPeers([])
    roomPeers.current = []
  }, [roomId, closePeerConnection])

  const sendChat = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: myPeerId || '',
      senderName: userInfo.displayName,
      text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, msg])

    for (const [, dc] of dcMap.current) {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify({
          type: 'chat',
          text,
          senderName: userInfo.displayName,
        }))
      }
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        roomId: roomId || '',
        payload: { text, senderName: userInfo.displayName },
        senderId: myPeerId || '',
      }))
    }
  }, [myPeerId, userInfo.displayName, roomId])

  const sendToAll = useCallback((type: string, payload: unknown) => {
    for (const [, dc] of dcMap.current) {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify({ type, ...(payload as object) }))
      }
    }
  }, [])

  useEffect(() => {
    connectSignaling()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      for (const [id] of pcMap.current) {
        closePeerConnection(id)
      }
      wsRef.current?.close()
    }
  }, [connectSignaling, closePeerConnection])

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
    sendToAll,
    peers,
    messages,
    connectionState,
    error,
    roomId,
    myPeerId,
  }
}
