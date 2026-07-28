import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import VideoPlayer from '@app/components/VideoPlayer'

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
  hostStateRef: React.MutableRefObject<SyncPing | null>
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
  partyId, isHost, wsRef, startAt, onClose, hostState, hostStateRef, isDetached, onToggleDetach, preloadedStream,
  messages, onSendChat,
}: PartyPlayerProps) {
  const [resolved, setResolved] = useState<{ type: 'direct' | 'hls'; url: string; seasonNumber?: number; episodeNumber?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(true)
  const [countdown, setCountdown] = useState(-1)
  const [drift, setDrift] = useState<number | null>(null)
  const [hostPaused, setHostPaused] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const driftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const smoothedDriftRef = useRef<number | null>(null)
  const driftEMA = 0.25

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
    if (isHost) return
    const hs = hostState
    setHostPaused(hs ? !hs.isPlaying : false)
  }, [hostState, isHost])

  useEffect(() => {
    if (!isHost && hostState && !isDetached) {
      const v = getVideo()
      if (!v) return
      if (hostState.isPlaying && v.paused) {
        v.play().catch(() => {})
      }
    }
  }, [hostState, isDetached, isHost])

  useEffect(() => {
    if (!playerReady || isHost) return
    if (driftTimerRef.current) clearInterval(driftTimerRef.current)

    driftTimerRef.current = setInterval(() => {
      const v = getVideo()
      const hs = hostStateRef.current
      if (!v || !hs) { setDrift(null); setHostPaused(false); return }
      setHostPaused(!hs.isPlaying)
      const latency = (Date.now() - hs.timestamp) / 1000
      const hostAdjusted = hs.currentTime + (hs.isPlaying ? latency : 0)
      const raw = Math.round((v.currentTime - hostAdjusted) * 10) / 10
      if (smoothedDriftRef.current === null) {
        smoothedDriftRef.current = raw
      } else {
        smoothedDriftRef.current = driftEMA * raw + (1 - driftEMA) * smoothedDriftRef.current
      }
      setDrift(Math.round(smoothedDriftRef.current * 10) / 10)
    }, 500)

    return () => { if (driftTimerRef.current) clearInterval(driftTimerRef.current) }
  }, [playerReady, isHost])

  const handleResync = useCallback(() => {
    const v = getVideo()
    const hs = hostStateRef.current
    if (!v || !hs) return
    if (isDetached) onToggleDetach()
    v.currentTime = hs.currentTime + 0.3
    smoothedDriftRef.current = null
    if (hs.isPlaying) {
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [isDetached, onToggleDetach])

  const handleClose = useCallback(() => {
    if (isHost && wsRef.current?.readyState === WebSocket.OPEN && partyId) {
      wsRef.current.send(JSON.stringify({ type: 'close-player', roomId: partyId, payload: {}, senderId: '' }))
    }
    onClose()
  }, [isHost, wsRef, partyId, onClose])

  const retryResolve = () => { setError(null); resolveStream() }

  if (error) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="mb-4 text-lg text-red-400">Failed to start playback</p>
          <p className="mb-6 text-sm text-slate-400">{error}</p>
          <button onClick={retryResolve} className="rounded-lg bg-accent-600 px-4 py-2 text-sm text-white hover:bg-accent-500">Retry</button>
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
            <p className="mt-2 text-6xl font-bold text-accent-400">{countdown}</p>
          </div>
        </div>
      )}

      {countdown === 0 && resolving && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-accent-500 border-t-transparent" />
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
            drift={drift}
            hostPaused={hostPaused}
            isDetached={isDetached}
            isHost={isHost}
            onResync={handleResync}
            onToggleDetach={onToggleDetach}
            messages={messages}
            onSendChat={onSendChat}
          />
        </>,
        document.body
      )}
    </>
  )
}
