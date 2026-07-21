import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import VideoPlayer from '@app/components/VideoPlayer'
import DriftOverlay from '@app/components/WatchParty/DriftOverlay'

interface SyncPing { currentTime: number; isPlaying: boolean; timestamp: number }
interface PreloadedStream { type: 'direct' | 'hls'; url: string; seasonNumber?: number; episodeNumber?: number }
interface ChatMsg { id: string; senderName: string; text: string; timestamp: number; system?: boolean }

interface PartyPlayerProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath?: string
  seasonNumber?: number
  episodeNumber?: number
  partyId: string | undefined
  isHost: boolean
  wsRef: React.RefObject<WebSocket | null>
  startAt: number | null
  onClose: () => void
  hostState: SyncPing | null
  isDetached: boolean
  onToggleDetach: () => void
  preloadedStream?: PreloadedStream | null
  messages: ChatMsg[]
  onSendChat: (text: string) => void
}

function getVideo(): HTMLVideoElement | null {
  return document.querySelector('video')
}

export default function PartyPlayer({
  tmdbId, mediaType, title, posterPath, seasonNumber, episodeNumber,
  partyId, isHost, wsRef, startAt, onClose, hostState, isDetached, onToggleDetach, preloadedStream,
  messages, onSendChat,
}: PartyPlayerProps) {
  const [resolved, setResolved] = useState<{ type: 'direct' | 'hls'; url: string; seasonNumber?: number; episodeNumber?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(true)
  const [countdown, setCountdown] = useState(-1)
  const [pauseCountdown, setPauseCountdown] = useState(-1)
  const [drift, setDrift] = useState<number | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [playerReady, setPlayerReady] = useState(false)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const driftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hostStateRef = useRef<SyncPing | null>(null)
  const wasPlayingRef = useRef(true)

  useEffect(() => { hostStateRef.current = hostState }, [hostState])

  useEffect(() => {
    return () => {
      if (pingRef.current) clearInterval(pingRef.current)
      if (driftTimerRef.current) clearInterval(driftTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!startAt) return
    const diff = Math.ceil((startAt - Date.now()) / 1000)
    if (diff <= 0) {
      startPlayback()
      return
    }
    setCountdown(diff)
    let timeout: ReturnType<typeof setTimeout>
    const update = () => {
      const d = Math.ceil((startAt - Date.now()) / 1000)
      if (d <= 0) { startPlayback() }
      else { setCountdown(d); timeout = setTimeout(update, 200) }
    }
    timeout = setTimeout(update, 200)
    return () => clearTimeout(timeout)
  }, [startAt])

  const startPlayback = () => {
    setCountdown(0)
    if (preloadedStream) {
      setResolved({ type: preloadedStream.type as 'direct' | 'hls', url: preloadedStream.url, seasonNumber: preloadedStream.seasonNumber, episodeNumber: preloadedStream.episodeNumber })
      setResolving(false)
      setPlayerReady(true)
    } else { resolveStream() }
  }

  const resolveStream = async () => {
    setResolving(true); setError(null)
    try {
      const qs = seasonNumber != null ? `&seasonNumber=${seasonNumber}&episodeNumber=${episodeNumber}` : ''
      const res = await fetch(`/api/v1/media/${tmdbId}/play?mediaType=${mediaType}${qs}`)
      if (!res.ok) throw new Error('Failed to resolve stream')
      const data = await res.json()
      if (!data?.url) throw new Error('No stream URL')
      setResolved(data)
      setPlayerReady(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream error')
    } finally { setResolving(false) }
  }

  useEffect(() => {
    if (!resolved?.url || !isHost || !wsRef.current || !partyId) return
    pingRef.current = setInterval(() => {
      const v = getVideo()
      if (!v || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      wsRef.current.send(JSON.stringify({
        type: 'sync-ping', roomId: partyId,
        payload: { currentTime: v.currentTime, isPlaying: !v.paused, timestamp: Date.now() },
        senderId: '',
      }))
    }, 3000)
    return () => { if (pingRef.current) clearInterval(pingRef.current) }
  }, [resolved?.url, isHost, wsRef, partyId])

  useEffect(() => {
    const hs = hostStateRef.current
    if (!hs || isDetached || isHost) return
    const v = getVideo()
    if (!v) return
    if (hs.isPlaying && v.paused) { v.play().catch(() => {}); wasPlayingRef.current = true }
    if (!hs.isPlaying && !v.paused && wasPlayingRef.current) {
      wasPlayingRef.current = false
      setPauseCountdown(5)
    }
    if (hs.isPlaying) wasPlayingRef.current = true
  }, [hostState, isDetached, isHost])

  useEffect(() => {
    if (pauseCountdown <= 0) return
    const t = setTimeout(() => {
      const next = pauseCountdown - 1
      if (next <= 0) {
        setPauseCountdown(-1)
        const v = getVideo()
        const hs = hostStateRef.current
        if (v && !v.paused) {
          if (hs) v.currentTime = hs.currentTime
          v.pause()
        }
      } else setPauseCountdown(next)
    }, 1000)
    return () => clearTimeout(t)
  }, [pauseCountdown])

  useEffect(() => {
    if (!playerReady || isHost) return
    if (driftTimerRef.current) clearInterval(driftTimerRef.current)

    driftTimerRef.current = setInterval(() => {
      const v = getVideo()
      const hs = hostStateRef.current
      if (!v || !hs) { setDrift(null); return }
      if (isDetached) { setDrift(null); return }
      const latency = (Date.now() - hs.timestamp) / 1000
      const hostAdjusted = hs.currentTime + (hs.isPlaying ? latency : 0)
      const d = Math.round((v.currentTime - hostAdjusted) * 10) / 10
      setDrift(d)
      if (Math.abs(d) > 10 && hs.isPlaying) {
        v.currentTime = hs.currentTime + 0.5
        setDrift(0)
      }
    }, 500)

    return () => { if (driftTimerRef.current) clearInterval(driftTimerRef.current) }
  }, [playerReady, isHost])

  const handleResync = useCallback(() => {
    const v = getVideo()
    const hs = hostStateRef.current
    if (!v || !hs) return
    v.currentTime = hs.currentTime + 0.5
    setDrift(0)
  }, [])

  const handleClose = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && partyId) {
      wsRef.current.send(JSON.stringify({ type: 'close-player', roomId: partyId, payload: {}, senderId: '' }))
    }
    onClose()
  }, [wsRef, partyId, onClose])

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    onSendChat(chatInput.trim())
    setChatInput('')
  }

  const retryResolve = () => { setError(null); resolveStream() }

  if (error) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="mb-4 text-lg text-red-400">Failed to start playback</p>
          <p className="mb-6 text-sm text-slate-400">{error}</p>
          <button onClick={retryResolve} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">Retry</button>
          <button onClick={handleClose} className="ml-3 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/20">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <>
      {countdown > 0 && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-white">{title}</h1>
            <p className="text-lg text-slate-400">Playback starts in</p>
            <p className="mt-2 text-6xl font-bold text-indigo-400">{countdown}</p>
          </div>
        </div>
      )}

      {countdown === 0 && resolving && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-t-transparent" />
        </div>
      )}

      {pauseCountdown > 0 && !isHost && (
        <div className="fixed right-4 top-20 z-[10001] rounded-xl bg-black/80 px-4 py-2 shadow-lg backdrop-blur">
          <p className="text-sm text-white">Pausing in <span className="font-bold text-indigo-400">{pauseCountdown}</span></p>
        </div>
      )}

      {countdown === 0 && resolved?.url && createPortal(
        <>
          <VideoPlayer
            type={resolved.type as 'direct' | 'hls'}
            streamUrl={resolved.url}
            title={title}
            posterUrl={posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined}
            initialPosition={0}
            tmdbId={tmdbId}
            mediaType={mediaType}
            seasonNumber={seasonNumber ?? resolved.seasonNumber}
            episodeNumber={episodeNumber ?? resolved.episodeNumber}
            onClose={handleClose}
          />
          <DriftOverlay drift={drift} isHost={isHost} isDetached={isDetached} onResync={handleResync} onToggleDetach={onToggleDetach} />

          <button
            onClick={() => setShowChat((v) => !v)}
            className="fixed bottom-24 right-4 z-[9999] rounded-xl bg-black/70 px-3 py-2 text-xs font-medium text-white/80 shadow-lg backdrop-blur hover:text-white"
          >
            {showChat ? 'Hide Chat' : `Chat (${messages.length})`}
          </button>

          {showChat && (
            <div className="fixed bottom-36 right-4 z-[9999] flex h-80 w-72 flex-col rounded-xl bg-black/85 shadow-xl backdrop-blur ring-1 ring-white/10">
              <div className="flex-1 overflow-y-auto p-3">
                {messages.length === 0 && <p className="pt-8 text-center text-xs text-slate-500">Nothing to see here yet...</p>}
                {messages.slice(-30).map((m) => (
                  <div key={m.id} className="mb-2">
                    {m.system ? (
                      <p className="text-center text-[11px] text-slate-500 italic">{m.text}</p>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-indigo-400">{m.senderName}</span>
                        <p className="text-xs text-slate-300">{m.text}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={handleChatSubmit} className="border-t border-white/10 p-2">
                <div className="flex gap-1.5">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Chat..." className="flex-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none" />
                  <button type="submit" disabled={!chatInput.trim()} className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50">Send</button>
                </div>
              </form>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  )
}
