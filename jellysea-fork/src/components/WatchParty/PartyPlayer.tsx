import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import VideoPlayer from '@app/components/VideoPlayer'
import DriftOverlay from '@app/components/WatchParty/DriftOverlay'

interface SyncPing { currentTime: number; isPlaying: boolean; timestamp: number }
interface PreloadedStream { type: 'direct' | 'hls'; url: string; seasonNumber?: number; episodeNumber?: number }

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
}

export default function PartyPlayer({
  tmdbId, mediaType, title, posterPath, seasonNumber, episodeNumber,
  partyId, isHost, wsRef, startAt, onClose, hostState, isDetached, onToggleDetach, preloadedStream,
}: PartyPlayerProps) {
  const [resolved, setResolved] = useState<{ type: 'direct' | 'hls'; url: string; seasonNumber?: number; episodeNumber?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(true)
  const [countdown, setCountdown] = useState(-1)
  const [drift, setDrift] = useState<number | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const driftRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pingRef.current) clearInterval(pingRef.current)
      if (driftRef.current) clearInterval(driftRef.current)
    }
  }, [])

  useEffect(() => {
    if (!startAt) return
    let timeout: ReturnType<typeof setTimeout>
    const update = () => {
      const diff = Math.ceil((startAt - Date.now()) / 1000)
      if (diff <= 0) {
        setCountdown(0)
        if (preloadedStream) {
          setResolved({ type: preloadedStream.type, url: preloadedStream.url, seasonNumber: preloadedStream.seasonNumber, episodeNumber: preloadedStream.episodeNumber })
          setResolving(false)
        } else {
          resolveStream()
        }
      } else {
        setCountdown(diff)
        timeout = setTimeout(update, 200)
      }
    }
    update()
    return () => clearTimeout(timeout)
  }, [startAt])

  const resolveStream = async () => {
    setResolving(true)
    setError(null)
    try {
      const qs = seasonNumber != null ? `&seasonNumber=${seasonNumber}&episodeNumber=${episodeNumber}` : ''
      const res = await fetch(`/api/v1/media/${tmdbId}/play?mediaType=${mediaType}${qs}`)
      if (!res.ok) throw new Error('Failed to resolve stream')
      const data = await res.json()
      if (!data?.url) throw new Error('No stream URL')
      setResolved(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stream error')
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    if (!resolved?.url || !isHost || !wsRef.current || !partyId) return
    pingRef.current = setInterval(() => {
      const v = document.querySelector('video')
      if (!v || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      wsRef.current.send(JSON.stringify({
        type: 'sync-ping',
        roomId: partyId,
        payload: { currentTime: v.currentTime, isPlaying: !v.paused, timestamp: Date.now() },
        senderId: '',
      }))
    }, 3000)
    return () => { if (pingRef.current) clearInterval(pingRef.current) }
  }, [resolved?.url, isHost, wsRef, partyId])

  useEffect(() => {
    if (!hostState || isDetached || isHost) return
    const v = document.querySelector('video')
    if (!v) return
    if (hostState.isPlaying && v.paused) { v.play().catch(() => {}) }
    if (!hostState.isPlaying && !v.paused) {
      const latency = (Date.now() - hostState.timestamp) / 1000
      const hostAdjusted = hostState.currentTime + (hostState.isPlaying ? latency : 0)
      if (v.currentTime > hostAdjusted) v.pause()
    }
  }, [hostState, isDetached, isHost])

  useEffect(() => {
    if (!hostState || isDetached || isHost) { setDrift(null); return }
    driftRef.current = setInterval(() => {
      const v = document.querySelector('video')
      if (!v || !hostState) return
      const latency = (Date.now() - hostState.timestamp) / 1000
      const hostAdjusted = hostState.currentTime + (hostState.isPlaying ? latency : 0)
      setDrift(Math.round((v.currentTime - hostAdjusted) * 10) / 10)
    }, 500)
    return () => { if (driftRef.current) clearInterval(driftRef.current) }
  }, [hostState, isDetached, isHost])

  const handleResync = () => {
    const v = document.querySelector('video')
    if (!v || !hostState) return
    v.currentTime = hostState.currentTime + 0.5
  }

  const retryResolve = () => {
    setError(null)
    resolveStream()
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="mb-4 text-lg text-red-400">Failed to start playback</p>
          <p className="mb-6 text-sm text-slate-400">{error}</p>
          <button onClick={retryResolve} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">Retry</button>
          <button onClick={onClose} className="ml-3 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/20">Cancel</button>
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

      {countdown === 0 && resolved?.url && createPortal(
        <>
          <VideoPlayer
            type={(resolved.type as 'direct' | 'hls') || 'hls'}
            streamUrl={resolved.url}
            title={title}
            posterUrl={posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined}
            initialPosition={0}
            tmdbId={tmdbId}
            mediaType={mediaType}
            seasonNumber={seasonNumber ?? resolved.seasonNumber}
            episodeNumber={episodeNumber ?? resolved.episodeNumber}
            onClose={onClose}
          />
          <DriftOverlay
            drift={drift}
            isDetached={isDetached}
            onResync={handleResync}
            onToggleDetach={onToggleDetach}
          />
        </>,
        document.body
      )}
    </>
  )
}
