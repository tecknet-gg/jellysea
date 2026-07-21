import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useUser } from '@app/hooks/useUser'
import LoadingSpinner from '@app/components/Common/LoadingSpinner'
import { fetchParties, checkPartyPassword } from '@app/utils/partyApi'
import type { Party } from '@app/utils/partyTypes'
import type { NextPage } from 'next'

const PartyRoomPage: NextPage = () => {
  const router = useRouter()
  const { user } = useUser()
  const { partyId } = router.query

  const [party, setParty] = useState<Party | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)
  const [connectionState, setConnectionState] = useState('disconnected')
  const [messages, setMessages] = useState<{ id: string; senderName: string; text: string; timestamp: number }[]>([])
  const [chatInput, setChatInput] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const signalingUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SIGNALING_URL
      ? process.env.NEXT_PUBLIC_SIGNALING_URL
      : 'wss://test.tecknet.dev/vp'

  useEffect(() => {
    if (!partyId || typeof partyId !== 'string') return

    fetchParties().then((list) => {
      const p = list.find((x) => x.id === partyId)
      if (p) {
        setParty(p)
        if (!p.hasPassword) setAuthed(true)
      } else {
        setError('Party not found')
      }
    }).catch(() => setError('Failed to load party')).finally(() => setLoading(false))
  }, [partyId])

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || typeof partyId !== 'string') return
    const ok = await checkPartyPassword(partyId, password.trim())
    if (ok) {
      setAuthed(true)
      setPasswordError(null)
    } else {
      setPasswordError('Invalid password')
    }
  }, [password, partyId])

  useEffect(() => {
    if (!authed || !partyId) return

    const ws = new WebSocket(signalingUrl)
    wsRef.current = ws
    setConnectionState('connecting')

    ws.onopen = () => {
      setConnectionState('connected')
      ws.send(JSON.stringify({
        type: 'set-user-info',
        roomId: partyId,
        payload: { displayName: user?.displayName || user?.username || 'Anonymous', avatar: user?.avatar },
        senderId: '',
      }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
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
    }

    ws.onclose = () => setConnectionState('disconnected')
    ws.onerror = () => setConnectionState('disconnected')

    return () => { ws.close() }
  }, [authed, partyId, signalingUrl, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleChat = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const name = user?.displayName || user?.username || 'Anonymous'
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      senderId: '',
      senderName: name,
      text: chatInput.trim(),
      timestamp: Date.now(),
    }])

    wsRef.current.send(JSON.stringify({
      type: 'chat',
      roomId: partyId,
      payload: { text: chatInput.trim(), senderName: name },
      senderId: '',
    }))
    setChatInput('')
  }, [chatInput, partyId, user])

  const connColor = connectionState === 'connected' ? 'bg-green-500'
    : connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="mt-16 text-center">
        <p className="text-lg text-red-400">{error}</p>
        <Link href="/parties" className="mt-4 inline-block text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Back to parties
        </Link>
      </div>
    )
  }

  if (!party) return null

  if (!authed) {
    return (
      <div className="mx-auto mt-16 max-w-sm">
        <div className="rounded-xl border border-dark-600 bg-dark-900 p-6">
          <h1 className="mb-1 text-lg font-bold text-white">{party.name}</h1>
          <p className="mb-4 text-sm text-slate-400">This party requires a password</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
            <button
              type="submit"
              disabled={!password.trim()}
              className="w-full rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
            >
              Join Party
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/parties" className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Back to parties
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{party.name}</h1>
        <div className="flex items-center gap-2 rounded-lg bg-dark-800 px-2.5 py-1">
          <div className={`h-2 w-2 rounded-full ${connColor}`} />
          <span className="text-xs text-slate-400 capitalize">{connectionState}</span>
        </div>
        <span className="rounded-full bg-dark-800 px-2.5 py-1 text-xs text-slate-400">
          {party.memberCount} member{party.memberCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-dark-600 bg-dark-900">
            <div className="border-b border-dark-600 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Party Chat</h2>
            </div>
            <div className="h-80 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="pt-8 text-center text-sm text-slate-500">
                  No messages yet. Start the conversation!
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-indigo-400">{m.senderName}</span>
                    <span className="text-xs text-slate-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-slate-300">{m.text}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleChat} className="border-t border-dark-600 p-3">
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
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-dark-600 bg-dark-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Party Info</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">Host: </span>
                <span className="text-slate-300">{party.hostName}</span>
              </div>
              <div>
                <span className="text-slate-500">Status: </span>
                <span className="capitalize text-slate-300">{party.status}</span>
              </div>
              <div>
                <span className="text-slate-500">Members: </span>
                <span className="text-slate-300">{party.memberCount}</span>
              </div>
              {party.media && (
                <div>
                  <span className="text-slate-500">Media: </span>
                  <span className="text-slate-300">{party.media.title}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PartyRoomPage
