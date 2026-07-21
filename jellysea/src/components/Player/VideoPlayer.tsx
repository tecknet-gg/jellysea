import { useRef, useEffect, useState, useCallback } from 'react'
import Hls from 'hls.js'

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

const STORAGE_PREFIX = 'jellysea_progress_'

interface VideoPlayerProps {
  streamUrl: string
  itemId: string
  title?: string
  tmdbId?: number
  mediaType?: 'movie' | 'tv'
  seasonNumber?: number
  episodeNumber?: number
  initialPosition?: number
  onEnded?: () => void
  onError?: (error: string) => void
  onNextEpisode?: () => void
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoPlayer({
  streamUrl,
  itemId,
  title,
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
  initialPosition,
  onEnded,
  onError,
  onNextEpisode,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialSeekDone = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(true)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [buffered, setBuffered] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [levels, setLevels] = useState<{ index: number; label: string; height: number }[]>([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [showNextButton, setShowNextButton] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [previewX, setPreviewX] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)

  const canGoNext = mediaType === 'tv' && !!onNextEpisode

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    if (!paused) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [paused])

  const saveProgress = useCallback(() => {
    if (!tmdbId || !mediaType || !videoRef.current?.duration) return
    const video = videoRef.current
    try {
      const key = mediaType === 'tv' && seasonNumber !== undefined && episodeNumber !== undefined
        ? `${STORAGE_PREFIX}${tmdbId}_${mediaType}_S${seasonNumber}_E${episodeNumber}`
        : `${STORAGE_PREFIX}${tmdbId}_${mediaType}`
      localStorage.setItem(key, JSON.stringify({
        position: video.currentTime,
        duration: video.duration,
        title: title || '',
        updatedAt: new Date().toISOString(),
        seasonNumber,
        episodeNumber,
      }))
    } catch {}
  }, [tmdbId, mediaType, title, seasonNumber, episodeNumber])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const isHls = /\.m3u8(?:\?|$)/.test(streamUrl)

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          startLevel: -1,
          capLevelToPlayerSize: false,
        })
        hlsRef.current = hls

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const lvls = (hls.levels ?? []).map((level, index) => ({
            index,
            label:
              level.height >= 2160 ? '4K'
              : level.height >= 1080 ? '1080p'
              : level.height >= 720 ? '720p'
              : level.height >= 480 ? '480p'
              : '360p',
            height: level.height,
          }))
          setLevels(lvls)
          setCurrentLevel(-1)
          setLoading(false)
          video.play().catch(() => {})
        })

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setCurrentLevel(data.level)
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              setError('Playback error occurred')
              onError?.('HLS fatal error')
              break
          }
        })

        hls.loadSource(streamUrl)
        hls.attachMedia(video)
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl
        video.addEventListener('loadedmetadata', () => {
          setLoading(false)
          video.play().catch(() => {})
        })
      } else {
        setError('HLS playback is not supported in this browser')
        onError?.('HLS not supported')
      }
    } else {
      video.src = streamUrl
      video.addEventListener('loadedmetadata', () => {
        setLoading(false)
        video.play().catch(() => {})
      })
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [streamUrl, onError])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      setDuration(video.duration || 0)
    }
    const onPlay = () => { setPlaying(true); setPaused(false); setLoading(false); setIsBuffering(false) }
    const onPause = () => { setPaused(true) }
    const onWaiting = () => setIsBuffering(true)
    const onCanPlay = () => setIsBuffering(false)
    const onPlaying = () => setIsBuffering(false)
    const onEndedHandler = () => {
      setPlaying(false)
      setIsFinished(true)
      if (canGoNext) setShowNextButton(true)
    }
    const onErrorHandler = () => {
      setError('Video playback error')
      setLoading(false)
      onError?.('Video element error')
    }
    const onVolumeChange = () => {
      setMuted(video.muted)
      setVolume(video.volume)
    }
    const updateBuffered = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }

    const handleFullscreenChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('ended', onEndedHandler)
    video.addEventListener('error', onErrorHandler)
    video.addEventListener('volumechange', onVolumeChange)
    video.addEventListener('progress', updateBuffered)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('ended', onEndedHandler)
      video.removeEventListener('error', onErrorHandler)
      video.removeEventListener('volumechange', onVolumeChange)
      video.removeEventListener('progress', updateBuffered)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [canGoNext, onError])

  useEffect(() => {
    if (currentTime > 0 && duration > 0 && canGoNext) {
      setShowNextButton(duration - currentTime <= 120)
    }
  }, [currentTime, duration, canGoNext])

  useEffect(() => {
    if (initialPosition && initialPosition > 0 && !initialSeekDone.current) {
      const video = videoRef.current
      if (!video) return
      const doSeek = () => {
        if (video.duration > 0 && !initialSeekDone.current) {
          video.currentTime = initialPosition
          initialSeekDone.current = true
        }
      }
      video.addEventListener('loadedmetadata', doSeek)
      return () => video.removeEventListener('loadedmetadata', doSeek)
    }
  }, [initialPosition])

  useEffect(() => {
    if (!playing || !tmdbId) return
    saveTimerRef.current = setInterval(saveProgress, 30000)
    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [playing, tmdbId, saveProgress])

  useEffect(() => {
    return () => { saveProgress() }
  }, [saveProgress])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'j':
          e.preventDefault()
          skip(-10)
          break
        case 'l':
          e.preventDefault()
          skip(30)
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'escape':
          if (fullscreen) {
            e.preventDefault()
            document.exitFullscreen()
          }
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
    showControlsTemporarily()
  }, [showControlsTemporarily])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    const video = videoRef.current
    if (!bar || !video || !duration) return
    const rect = bar.getBoundingClientRect()
    video.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }, [duration])

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setPreviewTime(fraction * duration)
    setPreviewX(e.clientX - rect.left)
  }, [duration])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const v = parseFloat(e.target.value)
    video.volume = v
    video.muted = v === 0
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen()
    }
  }, [])

  const handleRateChange = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
    setShowSpeedMenu(false)
  }, [])

  const handleLevelChange = useCallback((index: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = index
    setCurrentLevel(index)
    setShowQualityMenu(false)
  }, [])

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || 0))
    showControlsTemporarily()
  }, [showControlsTemporarily])

  const handleRetry = useCallback(() => {
    setError(null)
    setIsBuffering(false)
    setIsFinished(false)
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    const video = videoRef.current
    if (video) video.removeAttribute('src')
    const url = streamUrl
    setCurrentLevel(-1)
    setLevels([])
    setTimeout(() => {
      if (hlsRef.current) hlsRef.current.destroy()
      hlsRef.current = null
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          startLevel: -1,
        })
        hlsRef.current = hls
        hls.loadSource(url)
        if (video) hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false)
          video?.play().catch(() => {})
        })
      }
    }, 100)
  }, [streamUrl])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="mb-4 flex justify-center">
            <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="mb-6 text-lg">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white transition hover:bg-indigo-500"
            >
              Retry
            </button>
            <button
              onClick={() => window.history.back()}
              className="rounded-lg bg-white/10 px-5 py-2 text-sm text-white/80 backdrop-blur hover:bg-white/20"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => !paused && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        onClick={togglePlay}
        playsInline
        preload="auto"
      >
        <track kind="captions" />
      </video>

      {isBuffering && playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-white/30 border-t-white" />
        </div>
      )}

      {!playing && !loading && !isFinished && (
        <div className="pointer-events-none absolute inset-0 flex cursor-pointer items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur">
            <svg viewBox="0 0 24 24" className="ml-1 h-10 w-10 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-white/20 border-t-white" />
        </div>
      )}

      {isFinished && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black/60">
          <div className="rounded-full bg-white/10 p-4">
            <svg viewBox="0 0 24 24" className="h-12 w-12 fill-white"><path d="M8 5v14l11-7z" /></svg>
          </div>
          <p className="text-xl text-white/80">Playback Complete</p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                const video = videoRef.current
                if (!video) return
                video.currentTime = 0
                video.play()
                setIsFinished(false)
                setShowNextButton(false)
              }}
              className="rounded-full bg-white/10 px-6 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Watch Again
            </button>
            {canGoNext && (
              <button
                onClick={() => { onNextEpisode?.(); setIsFinished(false) }}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2 text-sm text-white transition hover:bg-indigo-500"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                Next Episode
              </button>
            )}
            <button
              onClick={() => onEnded?.()}
              className="rounded-full bg-white/10 px-6 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute left-0 right-0 top-0 flex items-center gap-3 px-4 pt-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={() => {
            saveProgress()
            onEnded?.()
          }}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm hover:bg-black/60 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          Back
        </button>
        {title && <span className="text-sm font-semibold text-white drop-shadow-lg">{title}</span>}
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-10">
          <div className="mb-3">
            <div
              ref={progressRef}
              className="group relative h-1.5 cursor-pointer rounded-full bg-white/30 transition-all hover:h-2"
              onClick={handleSeek}
              onMouseMove={handleProgressHover}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/20 transition-all"
                style={{ width: `${bufferedProgress}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 scale-0 rounded-full bg-indigo-500 transition-transform group-hover:scale-100" />
              </div>
              <div
                className="pointer-events-none absolute -top-10 -translate-x-1/2 rounded-md bg-black/90 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                style={{ left: previewX }}
              >
                {formatTime(previewTime)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="pointer-events-auto rounded-full p-1.5 text-white/90 hover:bg-white/10 hover:text-white"
              title={paused ? 'Play (k)' : 'Pause (k)'}
            >
              {paused ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => skip(-10)}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              title="Back 10s (j)"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
              </svg>
            </button>

            <button
              onClick={() => skip(30)}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              title="Forward 30s (l)"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M11.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C18.92 11.03 14.97 8 11.5 8z" />
              </svg>
            </button>

            <button
              onClick={toggleMute}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              title={muted ? 'Unmute (m)' : 'Mute (m)'}
            >
              {muted || volume === 0 ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            <div className="flex items-center gap-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 appearance-none rounded-full bg-white/20 outline-none [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                style={{ height: 4 }}
              />
            </div>

            <span className="pointer-events-none select-none text-xs text-white/60 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
              {duration - currentTime > 0 && (
                <span className="ml-1 text-white/40">-{formatTime(duration - currentTime)}</span>
              )}
            </span>

            {showNextButton && canGoNext && !isFinished && (
              <button
                onClick={() => onNextEpisode?.()}
                className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-indigo-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                title="Next episode"
              >
                Next
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              </button>
            )}

            <div className="flex-1" />

            <div className="relative">
              <button
                onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false) }}
                className="pointer-events-auto rounded-md px-2 py-1 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                title="Playback speed"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 min-w-[88px] overflow-hidden rounded-lg bg-black/90 shadow-lg backdrop-blur-md">
                  {PLAYBACK_SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleRateChange(s)}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-white/10 ${
                        playbackRate === s ? 'font-bold text-white' : 'text-white/60'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {levels.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false) }}
                  className="pointer-events-auto rounded-md px-2 py-1 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                  title="Quality"
                >
                  {currentLevel === -1 ? 'Auto' : levels.find((l) => l.index === currentLevel)?.label ?? 'Auto'}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-[120px] overflow-hidden rounded-lg bg-black/90 shadow-lg backdrop-blur-md">
                    <button
                      onClick={() => handleLevelChange(-1)}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-white/10 ${
                        currentLevel === -1 ? 'font-bold text-white' : 'text-white/60'
                      }`}
                    >
                      Auto
                    </button>
                    {levels.map((level) => (
                      <button
                        key={level.index}
                        onClick={() => handleLevelChange(level.index)}
                        className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-white/10 ${
                          currentLevel === level.index ? 'font-bold text-white' : 'text-white/60'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={toggleFullscreen}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              title={fullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
            >
              {fullscreen ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
