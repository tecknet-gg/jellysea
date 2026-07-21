import { useState, useRef, useEffect, useCallback } from 'react'
import { useUser } from '@app/hooks/useUser'
import type { NextPage } from 'next'

const TestPanel: NextPage = () => {
  const { user } = useUser()

  const signalingUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SIGNALING_URL
      ? process.env.NEXT_PUBLIC_SIGNALING_URL
      : 'wss://test.tecknet.dev/vp'

  const [roomId, setRoomId] = useState<string | null>(null)
  const [myPeerId, setMyPeerId] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<string>('disconnected')
  const [peers, setPeers] = useState<{ id: string; displayName: string; state: string }[]>([])
  const [messages, setMessages] = useState<{ id: string; senderName: string; text: string; timestamp: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const createRoom = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const handler = (event: MessageEvent) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'room-created') {
        wsRef.current?.removeEventListener('message', handler)
        setRoomId(msg.payload.roomId)
      }
    }
    wsRef.current.addEventListener('message', handler)
    wsRef.current.send(JSON.stringify({
      type: 'create-room',
      roomId: '',
      payload: {},
      senderId: '',
    }))
  }, [])

  const joinRoom = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    if (!joinRoomId.trim()) return

    setJoinError(null)
    const handler = (event: MessageEvent) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'room-joined') {
        wsRef.current?.removeEventListener('message', handler)
        setRoomId(msg.payload.roomId)
      }
      if (msg.type === 'error') {
        wsRef.current?.removeEventListener('message', handler)
        setJoinError(msg.payload.message)
      }
    }
    wsRef.current.addEventListener('message', handler)
    wsRef.current.send(JSON.stringify({
      type: 'join-room',
      roomId: joinRoomId.trim(),
      payload: { roomId: joinRoomId.trim() },
      senderId: '',
    }))
    setJoinRoomId('')
  }, [joinRoomId])

  const leaveRoom = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && roomId) {
      wsRef.current.send(JSON.stringify({ type: 'leave-room', roomId, payload: {}, senderId: '' }))
    }
    setRoomId(null)
    setPeers([])
    setMessages([])
  }, [roomId])

  const sendChat = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const msg = {
      id: crypto.randomUUID(),
      senderId: myPeerId || '',
      senderName: user?.displayName || user?.username || 'Anonymous',
      text: chatInput.trim(),
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, msg])

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      roomId: roomId || '',
      payload: { text: chatInput.trim(), senderName: user?.displayName || user?.username || 'Anonymous' },
      senderId: myPeerId || '',
    }))
    setChatInput('')
  }, [chatInput, myPeerId, roomId, user])

  useEffect(() => {
    const ws = new WebSocket(signalingUrl)
    wsRef.current = ws
    setConnectionState('connecting')

    ws.onopen = () => {
      setConnectionState('connected')
      setError(null)
      ws.send(JSON.stringify({
        type: 'set-user-info',
        roomId: '',
        payload: { displayName: user?.displayName || user?.username || 'Anonymous', avatar: user?.avatar },
        senderId: '',
      }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'peer-id') {
        setMyPeerId(msg.payload.peerId)
      }

      if (msg.type === 'room-state') {
        setPeers(
          msg.payload.peers
            .filter((p: { id: string }) => p.id !== myPeerId)
            .map((p: { id: string; displayName: string }) => ({
              id: p.id,
              displayName: p.displayName,
              state: 'connected',
            }))
        )
      }

      if (msg.type === 'peer-left') {
        setPeers((prev) => prev.filter((p) => p.id !== msg.payload.peerId))
      }

      if (msg.type === 'chat') {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            senderId: msg.senderId,
            senderName: msg.payload.senderName,
            text: msg.payload.text,
            timestamp: Date.now(),
          },
        ])
      }

      if (msg.type === 'error') {
        setError(msg.payload.message)
      }
    }

    ws.onclose = () => {
      setConnectionState('disconnected')
    }

    ws.onerror = () => {
      setConnectionState('disconnected')
    }

    return () => {
      ws.close()
    }
  }, [signalingUrl, user, myPeerId])

  const connectionColor =
    connectionState === 'connected'
      ? 'bg-green-500'
      : connectionState === 'connecting'
        ? 'bg-yellow-500'
        : 'bg-red-500'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">WebRTC Test Panel</h1>
        <p className="mt-1 text-sm text-slate-400">
          Test WebSocket signaling and chat between browser tabs.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-dark-800 px-3 py-1.5">
          <div className={`h-2.5 w-2.5 rounded-full ${connectionColor}`} />
          <span className="text-sm font-medium capitalize text-slate-300">
            {connectionState}
          </span>
        </div>
        {myPeerId && (
          <span className="text-xs text-slate-500">ID: {myPeerId.slice(0, 8)}...</span>
        )}
        {roomId && (
          <span className="rounded-full bg-indigo-600/20 px-2.5 py-1 text-xs font-medium text-indigo-400">
            Room: {roomId}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {joinError && (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-400">
          {joinError}
        </div>
      )}

      {!roomId ? (
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-dark-600 bg-dark-900 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Create Room</h2>
            <p className="mb-4 text-sm text-slate-400">
              Start a new room and share the ID with others.
            </p>
            <button
              onClick={createRoom}
              disabled={connectionState !== 'connected'}
              className="w-full rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
            >
              Create Room
            </button>
          </div>
          <div className="rounded-xl border border-dark-600 bg-dark-900 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Join Room</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') joinRoom() }}
                placeholder="Room ID"
                className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={joinRoom}
                disabled={connectionState !== 'connected' || !joinRoomId.trim()}
                className="rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Room: {roomId}</h2>
          <button
            onClick={leaveRoom}
            className="rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            Leave Room
          </button>
        </div>
      )}

      {roomId && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-dark-600 bg-dark-900">
              <div className="border-b border-dark-600 px-4 py-3">
                <h3 className="text-sm font-semibold text-white">Chat</h3>
              </div>
              <div className="h-80 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="pt-8 text-center text-sm text-slate-500">
                    No messages yet. Start the conversation!
                  </p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className="mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-indigo-400">
                        {msg.senderName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{msg.text}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendChat} className="border-t border-dark-600 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div>
            <div className="rounded-xl border border-dark-600 bg-dark-900">
              <div className="border-b border-dark-600 px-4 py-3">
                <h3 className="text-sm font-semibold text-white">Peers ({peers.length})</h3>
              </div>
              <div className="p-3">
                {peers.length === 0 ? (
                  <p className="text-sm text-slate-500">No peers connected</p>
                ) : (
                  <ul className="space-y-2">
                    {peers.map((peer) => (
                      <li
                        key={peer.id}
                        className="flex items-center gap-2 rounded-lg bg-dark-800 px-3 py-2"
                      >
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-slate-300">{peer.displayName}</span>
                        <span className="ml-auto text-xs text-slate-500">{peer.state}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestPanel
