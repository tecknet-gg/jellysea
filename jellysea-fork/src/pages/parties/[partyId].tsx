import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useUser } from '@app/hooks/useUser'
import CachedImage from '@app/components/Common/CachedImage'
import LoadingSpinner from '@app/components/Common/LoadingSpinner'
import { fetchParties, checkPartyPassword, updatePartyMedia, updatePartyStatus, deleteParty } from '@app/utils/partyApi'
import MediaSearchModal from '@app/components/WatchParty/MediaSearchModal'
import type { Party, PartyMedia } from '@app/utils/partyTypes'
import type { NextPage } from 'next'

const PARTY_STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting for media',
  ready: 'Ready to watch',
  watching: 'Watching',
  paused: 'Paused',
}

const PARTY_STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ready: 'bg-green-500/20 text-green-400 border-green-500/30',
  watching: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  paused: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

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
  const [roomJoined, setRoomJoined] = useState(false)
  const [liveMembers, setLiveMembers] = useState(0)
  const [messages, setMessages] = useState<{ id: string; senderName: string; text: string; timestamp: number }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showMediaSearch, setShowMediaSearch] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const signalingUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SIGNALING_URL
      ? process.env.NEXT_PUBLIC_SIGNALING_URL
      : 'wss://test.tecknet.dev/vp'

  const isHost = user && party ? String(user.id) === party.hostId : false

  const refreshParty = useCallback(async () => {
    if (!partyId || typeof partyId !== 'string') return
    try {
      const list = await fetchParties()
      const p = list.find((x) => x.id === partyId)
      if (p) setParty(p)
    } catch { /* ignore polling errors */ }
  }, [partyId])

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

  useEffect(() => {
    if (!authed || !partyId || typeof partyId !== 'string') return

    const timer = setInterval(refreshParty, 5000)
    return () => clearInterval(timer)
  }, [authed, partyId, refreshParty])

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
    if (!authed || !partyId || typeof partyId !== 'string') return

    const ws = new WebSocket(signalingUrl)
    wsRef.current = ws
    setConnectionState('connecting')
    let joined = false

    ws.onopen = () => {
      setConnectionState('connected')
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
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId: partyId,
          payload: { roomId: partyId },
          senderId: '',
        }))
      }

      if (msg.type === 'room-joined' || msg.type === 'room-created') {
        joined = true
        setRoomJoined(true)
      }

      if (msg.type === 'error' && (msg.payload as { message?: string })?.message === 'Room not found') {
        ws.send(JSON.stringify({
          type: 'create-room',
          roomId: '',
          payload: { roomId: partyId },
          senderId: '',
        }))
      }

      if (msg.type === 'room-state') {
        setLiveMembers(msg.payload.peers?.length ?? 0)
      }

      if (msg.type === 'chat') {
        setMessages((prev) => [
          ...prev, {
            id: crypto.randomUUID(),
            senderId: msg.senderId,
            senderName: msg.payload.senderName,
            text: msg.payload.text,
            timestamp: Date.now(),
          },
        ])
      }
    }

    ws.onclose = () => {
      setConnectionState('disconnected')
      if (joined) setRoomJoined(false)
    }
    ws.onerror = () => setConnectionState('disconnected')

    return () => {
      if (wsRef.current && partyId && joined) {
        wsRef.current.send(JSON.stringify({
          type: 'leave-room', roomId: partyId, payload: {}, senderId: '',
        }))
      }
      ws.close()
    }
  }, [authed, partyId, signalingUrl, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleChat = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !roomJoined) return
    const name = user?.displayName || user?.username || 'Anonymous'
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(), senderId: '', senderName: name, text: chatInput.trim(), timestamp: Date.now(),
    }])
    wsRef.current.send(JSON.stringify({
      type: 'chat', roomId: partyId,
      payload: { text: chatInput.trim(), senderName: name },
      senderId: '',
    }))
    setChatInput('')
  }, [chatInput, partyId, user, roomJoined])

  const handleSelectMedia = useCallback(async (media: PartyMedia) => {
    if (!partyId || typeof partyId !== 'string') return
    try {
      await updatePartyMedia(partyId, media)
      await updatePartyStatus(partyId, 'ready')
      await refreshParty()
    } catch { /* ignore */ }
  }, [partyId, refreshParty])

  const handleRemoveMedia = useCallback(async () => {
    if (!partyId || typeof partyId !== 'string') return
    try {
      await updatePartyMedia(partyId, undefined as unknown as PartyMedia)
      await updatePartyStatus(partyId, 'waiting')
      await refreshParty()
    } catch { /* ignore */ }
  }, [partyId, refreshParty])

  const handleDeleteParty = useCallback(async () => {
    if (!partyId || typeof partyId !== 'string') return
    setDeleting(true)
    try {
      await deleteParty(partyId)
      router.push('/parties')
    } catch {
      setDeleting(false)
    }
  }, [partyId, router])

  const connColor = connectionState === 'connected' ? 'bg-green-500'
    : connectionState === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
  const memberCount = roomJoined ? liveMembers : (party?.memberCount ?? 0)

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
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
            <button type="submit" disabled={!password.trim()}
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{party.name}</h1>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PARTY_STATUS_COLORS[party.status] || ''}`}>
          {PARTY_STATUS_LABELS[party.status] || party.status}
        </span>
        <div className="flex items-center gap-2 rounded-lg bg-dark-800 px-2.5 py-1">
          <div className={`h-2 w-2 rounded-full ${connColor}`} />
          <span className="text-xs text-slate-400">{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        </div>
        {isHost && (
          <button
            onClick={() => {
              if (window.confirm('End this watch party? Everyone will be disconnected.')) handleDeleteParty()
            }}
            disabled={deleting}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/30 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
            {deleting ? 'Ending...' : 'End Party'}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {!party.media && (
            <div className="rounded-xl border border-dark-600 bg-dark-900 p-6 text-center">
              <p className="text-sm text-slate-400">
                {isHost ? 'No media selected yet' : 'Waiting for the host to choose media...'}
              </p>
              {isHost && (
                <button
                  onClick={() => setShowMediaSearch(true)}
                  className="mt-3 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-500 hover:to-purple-500"
                >
                  Select Movie or TV Show
                </button>
              )}
            </div>
          )}

          {party.media && (
            <div className="relative flex overflow-hidden rounded-xl bg-dark-900 bg-cover bg-center shadow ring-1 ring-dark-600">
              {party.media.backdropPath && (
                <div className="absolute inset-0">
                  <CachedImage type="tmdb" src={party.media.backdropPath} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(135deg, rgba(8,12,24,0.6) 0%, rgba(8,12,24,1) 70%)' }} />
                </div>
              )}
              <div className="relative z-10 flex w-full gap-4 p-5">
                <div className="w-24 flex-shrink-0 sm:w-32">
                  {party.media.posterPath ? (
                    <CachedImage
                      type="tmdb" src={party.media.posterPath} alt=""
                      className="w-full rounded-lg shadow-md"
                      style={{ aspectRatio: '600/900' }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-dark-700 text-xs text-slate-500" style={{ aspectRatio: '600/900' }}>N/A</div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <h2 className="text-lg font-bold text-white">{party.media.title}</h2>
                  <p className="text-xs text-slate-400 uppercase">
                    {party.media.mediaType === 'movie' ? 'Movie' : 'TV Series'}
                  </p>
                  {party.media.overview && (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-300">{party.media.overview}</p>
                  )}
                  {isHost && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setShowMediaSearch(true)}
                        className="rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleRemoveMedia}
                        className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-dark-600 bg-dark-900">
            <div className="border-b border-dark-600 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Party Chat</h2>
            </div>
            <div className="h-72 overflow-y-auto p-4">
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
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..." disabled={!roomJoined}
                  className="flex-1 rounded-lg border border-dark-600 bg-dark-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                />
                <button type="submit" disabled={!chatInput.trim() || !roomJoined}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-dark-600 bg-dark-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Party Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-dark-700">
                  {party.hostAvatar && <CachedImage type="avatar" src={party.hostAvatar} alt="" className="h-full w-full object-cover" />}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Host</p>
                  <p className="text-sm text-slate-200">{party.hostName}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold mt-0.5 ${PARTY_STATUS_COLORS[party.status] || ''}`}>
                  {PARTY_STATUS_LABELS[party.status] || party.status}
                </span>
              </div>
              {party.media && (
                <div>
                  <p className="text-xs text-slate-500">Now Watching</p>
                  <p className="text-sm font-medium text-slate-200">{party.media.title}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MediaSearchModal open={showMediaSearch} onClose={() => setShowMediaSearch(false)} onSelect={handleSelectMedia} />
    </div>
  )
}

export default PartyRoomPage
