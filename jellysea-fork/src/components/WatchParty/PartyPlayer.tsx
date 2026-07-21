import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import VideoPlayer from '@app/components/VideoPlayer'
import DriftOverlay from '@app/components/WatchParty/DriftOverlay'
import usePlaybackProgress from '@app/hooks/usePlaybackProgress'
import type { ResolveResult } from '@app/hooks/useJellyfinStream'

interface SyncPing { currentTime: number; isPlaying: boolean; timestamp: number }

interface PartyPlayerProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath?: string
  seasonNumber?: number
  episodeNumber?: number
  isHost: boolean
  wsRef: React.RefObject<WebSocket | null>
  startAt: number | null
  onClose: () => void
  hostState: SyncPing | null
  isDetached: boolean
  onToggleDetach: () => void
}

export default function PartyPlayer({
  tmdbId, mediaType, title, posterPath, seasonNumber, episodeNumber,
  isHost, wsRef, startAt, onClose, hostState, isDetached, onToggleDetach,
}: PartyPlayerProps) {
  const [resolved, setResolved] = useState<ResolveResult | null>(null)
  const [resolving, setResolving] = useState(true)
  const [countdown, setCountdown] = useState(-1)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { loadProgress } = usePlaybackProgress()
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { return () => { if (pingRef.current) clearInterval(pingRef.current) } }, [])

  useEffect(() => {
    if (!startAt) return
    let timeout: ReturnType<typeof setTimeout>
    const update = () => {
      const diff = Math.ceil((startAt - Date.now()) / 1000)
      if (diff <= 0) { setCountdown(0); resolveStream() }
      else { setCountdown(diff); timeout = setTimeout(update, 200) }
    }
    update()
    return () => clearTimeout(timeout)
  }, [startAt])

  const resolveStream = async () => {
    setResolving(true)
    try {
      const qs = seasonNumber != null ? `&seasonNumber=${seasonNumber}&episodeNumber=${episodeNumber}` : ''
      const res = await fetch(`/api/v1/media/${tmdbId}/play?mediaType=${mediaType}${qs}`)
      const data = await res.json()
      setResolved(data)
    } catch { onClose() }
    finally { setResolving(false) }
  }

  useEffect(() => {
    if (!resolved?.url || !isHost || !wsRef.current) return
    pingRef.current = setInterval(() => {
      const v = document.querySelector('video')
      if (!v || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
      wsRef.current.send(JSON.stringify({
        type: 'sync-ping',
        roomId: '',
        payload: { currentTime: v.currentTime, isPlaying: !v.paused, timestamp: Date.now() },
        senderId: '',
      }))
    }, 3000)
    return () => { if (pingRef.current) clearInterval(pingRef.current) }
  }, [resolved?.url, isHost, wsRef])

  useEffect(() => {
    if (!hostState || isDetached || isHost) return
    const v = document.querySelector('video')
    if (!v) return
    if (hostState.isPlaying && v.paused) v.play().catch(() => {})
    if (!hostState.isPlaying && !v.paused) {
      const latency = (Date.now() - hostState.timestamp) / 1000
      const hostAdjusted = hostState.currentTime + (hostState.isPlaying ? latency : 0)
      if (v.currentTime > hostAdjusted) v.pause()
    }
  }, [hostState, isDetached, isHost])

  const getDrift = (): number | null => {
    const v = document.querySelector('video')
    if (!v || !hostState || isDetached) return null
    const latency = (Date.now() - hostState.timestamp) / 1000
    const hostAdjusted = hostState.currentTime + (hostState.isPlaying ? latency : 0)
    return Math.round((v.currentTime - hostAdjusted) * 10) / 10
  }

  const handleResync = () => {
    const v = document.querySelector('video')
    if (!v || !hostState) return
    v.currentTime = hostState.currentTime + 0.5
  }

  const drift = hostState && !isDetached ? getDrift() : null
  const resumePos = seasonNumber != null && episodeNumber != null
    ? loadProgress(tmdbId, mediaType, seasonNumber, episodeNumber)?.position
    : loadProgress(tmdbId, mediaType)?.position

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
            type={resolved.type || 'hls'}
            streamUrl={resolved.url}
            title={title}
            posterUrl={posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined}
            initialPosition={resumePos}
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
