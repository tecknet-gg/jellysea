import { useRef, useCallback } from 'react'

interface SyncPing {
  currentTime: number
  isPlaying: boolean
  timestamp: number
}

interface UseWatchPartySyncOptions {
  isHost: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  startAt?: number | null
  hostState?: SyncPing | null
}

export function useWatchPartySync({ isHost, videoRef, startAt, hostState }: UseWatchPartySyncOptions) {
  const syncedRef = useRef(false)

  const getDrift = useCallback((): number | null => {
    const v = videoRef.current
    if (!v || !hostState) return null
    const latency = (Date.now() - hostState.timestamp) / 1000
    const hostAdjusted = hostState.currentTime + (hostState.isPlaying ? latency : 0)
    return Math.round((v.currentTime - hostAdjusted) * 10) / 10
  }, [videoRef, hostState])

  const handleResync = useCallback(() => {
    const v = videoRef.current
    if (!v || !hostState) return
    v.currentTime = hostState.currentTime + 0.5
  }, [videoRef, hostState])

  const getPingPayload = useCallback((): SyncPing | null => {
    const v = videoRef.current
    if (!v) return null
    return { currentTime: v.currentTime, isPlaying: !v.paused, timestamp: Date.now() }
  }, [videoRef])

  if (startAt && !syncedRef.current) {
    syncedRef.current = true
    const check = setInterval(() => {
      if (Date.now() >= startAt && videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play().catch(() => {})
        clearInterval(check)
      }
    }, 100)
  }

  return { getDrift, handleResync, getPingPayload }
}
