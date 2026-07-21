import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { TrashIcon, UserMinusIcon, ArrowPathIcon, PlayIcon } from '@heroicons/react/24/outline'
import useSWR from 'swr'
import { useUser, Permission } from '@app/hooks/useUser'
import CachedImage from '@app/components/Common/CachedImage'
import LoadingSpinner from '@app/components/Common/LoadingSpinner'
import api from '@app/utils/api'
import { fetchParties, checkPartyPassword, updatePartyMedia, updatePartyStatus, deleteParty, unbanUser } from '@app/utils/partyApi'
import LibraryBrowserModal from '@app/components/WatchParty/LibraryBrowserModal'
import SeasonEpisodeSelector from '@app/components/WatchParty/SeasonEpisodeSelector'
import PartyPlayer from '@app/components/WatchParty/PartyPlayer'
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
  const { user, hasPermission } = useUser()
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
  const [myPeerId, setMyPeerId] = useState<string | null>(null)
  const [otherMembers, setOtherMembers] = useState<{ id: string; displayName: string; avatar?: string }[]>([])
  const [playerActive, setPlayerActive] = useState(false)
  const [playbackActive, setPlaybackActive] = useState(false)
  const [playerStartAt, setPlayerStartAt] = useState<number | null>(null)
  const [hostSyncState, setHostSyncState] = useState<{ currentTime: number; isPlaying: boolean; timestamp: number } | null>(null)
  const [isDetached, setIsDetached] = useState(false)
  const [messages, setMessages] = useState<{ id: string; senderName: string; text: string; timestamp: number; system?: boolean }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showMediaSearch, setShowMediaSearch] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined)
  const [selectedEpisode, setSelectedEpisode] = useState<number | undefined>(undefined)

  const wsRef = useRef<WebSocket | null>(null)
  const myPeerIdRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const playerActiveRef = useRef(false)
  const isDetachedRef = useRef(false)
  const prevMemberCountRef = useRef(0)
  const prevPeerIdsRef = useRef<string[]>([])
  const playbackActiveRef = useRef(false)
  const [preloadedStream, setPreloadedStream] = useState<{ type: 'direct' | 'hls'; url: string; seasonNumber?: number; episodeNumber?: number } | null>(null)

  const signalingUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SIGNALING_URL
      ? process.env.NEXT_PUBLIC_SIGNALING_URL
      : 'wss://test.tecknet.dev/vp'

  const isHost = user && party ? String(user.id) === party.hostId : false
  const isAdmin = hasPermission(Permission.ADMIN)
  const canManage = isHost || isAdmin

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
        if (user && p.bannedUserIds.includes(String(user.id))) {
          setError('You have been banned from this party')
          setLoading(false)
          return
        }
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

  useEffect(() => {
    if (!authed || !party?.media || playerActive) return
    setPreloadedStream(null)
    const qs = party.media.seasonNumber != null ? `&seasonNumber=${party.media.seasonNumber}&episodeNumber=${party.media.episodeNumber}` : ''
    fetch(`/api/v1/media/${party.media.tmdbId}/play?mediaType=${party.media.mediaType}${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.url) setPreloadedStream({ type: data.type || 'hls', url: data.url, seasonNumber: data.seasonNumber, episodeNumber: data.episodeNumber })
      })
      .catch(() => {})
  }, [authed, party?.media, playerActive])

  useEffect(() => {
    if (party?.media?.seasonNumber) setSelectedSeason(party.media.seasonNumber)
    if (party?.media?.episodeNumber) setSelectedEpisode(party.media.episodeNumber)
  }, [party?.media?.seasonNumber, party?.media?.episodeNumber])

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
        payload: { displayName: user?.displayName || user?.username || 'Anonymous', avatar: user?.avatar, userId: String(user?.id) },
        senderId: '',
      }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'peer-id') {
        myPeerIdRef.current = msg.payload.peerId
        setMyPeerId(msg.payload.peerId)
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
        const peers = (msg.payload.peers ?? []) as { id: string; displayName: string }[]
        const newIds = peers.map((p) => p.id)
        const prevIds = prevPeerIdsRef.current
        const joined = peers.filter((p) => !prevIds.includes(p.id))
        if (joined.length > 0) {
          for (const p of joined) {
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(), senderId: '', senderName: 'System',
              text: `${p.displayName} joined the party`,
              timestamp: Date.now(), system: true,
            }])
          }
        }
        prevPeerIdsRef.current = newIds
        if (msg.payload.peers) {
          setOtherMembers(
            msg.payload.peers.filter((p: { userId?: string }) =>
              p.userId !== party?.hostId
            ).map((p: { id: string; displayName: string; avatar?: string }) => ({
              id: p.id,
              displayName: p.displayName,
              avatar: p.avatar,
            }))
          )
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(), senderId: '', senderName: 'System',
            text: `${msg.payload.peers.length} member${msg.payload.peers.length !== 1 ? 's' : ''} connected`,
            timestamp: Date.now(), system: true,
          }])
        }
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

      if (msg.type === 'party-ended') {
        if (wsRef.current) wsRef.current.close()
        router.push('/parties')
      }

      if (msg.type === 'kicked') {
        if (wsRef.current) wsRef.current.close()
        router.push('/parties')
      }

      if (msg.type === 'media-start') {
        playbackActiveRef.current = true
        setPlaybackActive(true)
        if (playerActiveRef.current) return
        const p = msg.payload as { startAt: number; tmdbId: number; mediaType: 'movie' | 'tv'; title: string; posterPath?: string; seasonNumber?: number; episodeNumber?: number }
        setPlayerStartAt(p.startAt)
        setPlayerActive(true)
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(), senderId: '', senderName: 'System', text: 'Playback started!', timestamp: Date.now(), system: true,
        }])
      }

      if (msg.type === 'sync-ping' && !isDetachedRef.current) {
        setHostSyncState(msg.payload as { currentTime: number; isPlaying: boolean; timestamp: number })
      }

      if (msg.type === 'close-player') {
        playbackActiveRef.current = false
        setPlaybackActive(false)
        handleClosePlayer()
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
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), senderId: '', senderName: 'System',
        text: `Media set to ${media.title}${media.mediaType === 'tv' && media.seasonNumber ? ` (S${media.seasonNumber}E${media.episodeNumber || ''})` : ''}`,
        timestamp: Date.now(), system: true,
      }])
    } catch { /* ignore */ }
  }, [partyId, refreshParty])

  const handleSeasonEpisodeUpdate = useCallback(async () => {
    if (!partyId || typeof partyId !== 'string' || !party?.media) return
    try {
      await updatePartyMedia(partyId, {
        ...party.media,
        seasonNumber: selectedSeason,
        episodeNumber: selectedEpisode,
      })
      await refreshParty()
    } catch { /* ignore */ }
  }, [partyId, party?.media, selectedSeason, selectedEpisode, refreshParty])

  const handleRemoveMedia = useCallback(async () => {
    if (!partyId || typeof partyId !== 'string') return
    try {
      await updatePartyMedia(partyId, null)
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

  const handleKickMember = useCallback((targetId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({
      type: 'kick-member', roomId: partyId, payload: { targetId }, senderId: '',
    }))
  }, [partyId])

  const handleUnban = useCallback(async (userId: string) => {
    if (!partyId || typeof partyId !== 'string') return
    try {
      await unbanUser(partyId, userId)
      await refreshParty()
    } catch { /* ignore */ }
  }, [partyId, refreshParty])

  const handleStartWatching = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !party?.media) return
    const startAt = Date.now() + 5000
    setPlayerStartAt(startAt)
    setPlayerActive(true)
    playerActiveRef.current = true
    const m = party.media
    wsRef.current.send(JSON.stringify({
      type: 'media-start',
      roomId: partyId,
      payload: { startAt, tmdbId: m.tmdbId, mediaType: m.mediaType, title: m.title, posterPath: m.posterPath, seasonNumber: m.seasonNumber, episodeNumber: m.episodeNumber },
      senderId: '',
    }))
    updatePartyStatus(partyId as string, 'watching').catch(() => {})
  }, [partyId, party?.media, wsRef])

  const handleClosePlayer = useCallback(() => {
    setPlayerActive(false)
    playerActiveRef.current = false
    setPlaybackActive(false)
    playbackActiveRef.current = false
    setPlayerStartAt(null)
    setHostSyncState(null)
    setIsDetached(false)
    isDetachedRef.current = false
    if (partyId) updatePartyStatus(partyId as string, 'ready').catch(() => {})
  }, [partyId])

  const handleJoinPlayback = useCallback(() => {
    if (!party?.media) return
    setPlayerStartAt(Date.now() + 3000)
    setPlayerActive(true)
  }, [party?.media])

  const mediaDetailsEndpoint = party?.media
    ? `/${party.media.mediaType === 'movie' ? 'movie' : 'tv'}/${party.media.tmdbId}`
    : null
  const { data: mediaDetails } = useSWR(mediaDetailsEndpoint, (url: string) => api.get(url).then((r) => r.data), { revalidateOnFocus: false, dedupingInterval: 60000 })

  function fmtRuntime(minutes: number): string {
    if (!minutes || minutes <= 0) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const rating = mediaDetails?.voteAverage ? (mediaDetails.voteAverage / 10 * 10).toFixed(1) : null
  const runtime = party?.media?.mediaType === 'movie'
    ? mediaDetails?.runtime
    : mediaDetails?.episodeRunTime?.[0]

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
                  {(rating || runtime) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                      {rating && <span>TMDB <span className="text-slate-200">{rating}</span>/10</span>}
                      {runtime && <span>{fmtRuntime(runtime)}</span>}
                    </div>
                  )}
                  {party.media.mediaType === 'tv' && (
                    <div className="mt-3">
                      <SeasonEpisodeSelector
                        tmdbId={party.media.tmdbId}
                        initialSeason={party.media.seasonNumber}
                        initialEpisode={party.media.episodeNumber}
                        onSeasonChange={(s) => setSelectedSeason(s)}
                        onEpisodeChange={(e) => setSelectedEpisode(e)}
                      />
                      {isHost && selectedSeason && selectedEpisode && (
                        <button
                          onClick={handleSeasonEpisodeUpdate}
                          className="mt-2 rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                        >
                          Update Season / Episode
                        </button>
                      )}
                      {party.media.seasonNumber && (
                        <p className="mt-1 text-xs text-slate-400">
                          Season {party.media.seasonNumber}
                          {party.media.episodeNumber ? `, Episode ${party.media.episodeNumber}` : ''}
                        </p>
                      )}
                    </div>
                  )}
                  {isHost && (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                      <button
                        onClick={handleStartWatching}
                        disabled={party.media.mediaType === 'tv' && !party.media.seasonNumber}
                        className="flex items-center gap-1 rounded-lg bg-green-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-40"
                        title={party.media.mediaType === 'tv' && !party.media.seasonNumber ? 'Select a season and episode first' : 'Start playback for all'}
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                        Start Watching
                      </button>
                    </div>
                  )}
                  {!isHost && party.status === 'watching' && !playerActive && (
                    <div className="mt-3">
                      <button
                        onClick={handleJoinPlayback}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        <PlayIcon className="h-3.5 w-3.5" />
                        Join Playback
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
                  Nothing to see here yet...
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className="mb-3">
                  {m.system ? (
                    <p className="text-center text-xs text-slate-500 italic">{m.text}</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-indigo-400">{m.senderName}</span>
                        <span className="text-xs text-slate-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-slate-300">{m.text}</p>
                    </>
                  )}
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
              {otherMembers.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500">Members</p>
                  <div className="mt-1 space-y-1">
                    {otherMembers.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {m.avatar ? (
                          <CachedImage type="avatar" src={m.avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-dark-700" />
                        )}
                        <span className="flex-1 text-sm text-slate-300">{m.displayName}</span>
        {canManage && (
                          <button
                            onClick={() => handleKickMember(m.id)}
                            className="rounded p-0.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                            title="Remove member"
                          >
                            <UserMinusIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {party.bannedUsers && party.bannedUsers.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500">Banned</p>
                  <div className="mt-1 space-y-1">
                    {party.bannedUsers.map((b, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="flex-1 text-sm text-slate-400 line-through">{b.displayName}</span>
                        {(isHost || isAdmin) && (
                          <button
                            onClick={() => handleUnban(b.userId)}
                            className="rounded p-0.5 text-slate-500 hover:bg-green-500/20 hover:text-green-400"
                            title="Unban"
                          >
                            <ArrowPathIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <LibraryBrowserModal open={showMediaSearch} onClose={() => setShowMediaSearch(false)} onSelect={handleSelectMedia} />

      {playerActive && party?.media && (
        <PartyPlayer
          tmdbId={party.media.tmdbId}
          mediaType={party.media.mediaType}
          title={party.media.title}
          posterPath={party.media.posterPath}
          seasonNumber={party.media.seasonNumber}
          episodeNumber={party.media.episodeNumber}
          partyId={typeof partyId === 'string' ? partyId : undefined}
          isHost={isHost}
          wsRef={wsRef}
          startAt={playerStartAt}
          onClose={handleClosePlayer}
          hostState={hostSyncState}
          isDetached={isDetached}
          onToggleDetach={() => { const next = !isDetached; setIsDetached(next); isDetachedRef.current = next }}
          preloadedStream={preloadedStream}
        />
      )}
    </div>
  )
}

export default PartyRoomPage
