'use client'

import usePlaybackProgress from '@app/hooks/usePlaybackProgress'
import type { ResolveNextResult } from '@app/hooks/useJellyfinStream'
import Hls from 'hls.js'
import {
  ArrowLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ForwardIcon,
  ExclamationTriangleIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsRightLeftIcon,
  LinkSlashIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useRef, useState, useCallback } from 'react'

interface ChatMsg { id: string; senderName: string; text: string; timestamp: number; system?: boolean }

interface VideoPlayerProps {
  type: 'direct' | 'hls'
  streamUrl: string
  title: string
  posterUrl?: string
  initialPosition?: number
  tmdbId: number
  mediaType: 'movie' | 'tv'
  seasonNumber?: number
  episodeNumber?: number
  onNextEpisode?: (currentSeason: number, currentEpisode: number) => Promise<ResolveNextResult | null>
  onClose: () => void
  drift?: number | null
  hostPaused?: boolean
  isDetached?: boolean
  isHost?: boolean
  onResync?: () => void
  onToggleDetach?: () => void
  messages?: ChatMsg[]
  onSendChat?: (text: string) => void
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoPlayer({
  type,
  streamUrl: initialStreamUrl,
  title: initialTitle,
  posterUrl,
  initialPosition,
  tmdbId,
  mediaType,
  seasonNumber: initialSeasonNumber,
  episodeNumber: initialEpisodeNumber,
  onNextEpisode,
  onClose,
  drift,
  hostPaused,
  isDetached,
  isHost,
  onResync,
  onToggleDetach,
  messages,
  onSendChat,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialSeekDone = useRef(false)
  const loadingNextRef = useRef(false)
  const volumeSliderId = useRef(`vol-${Math.random().toString(36).slice(2)}`).current
  const volumeStyleRef = useRef<HTMLStyleElement | null>(null)

  const [activeStreamUrl, setActiveStreamUrl] = useState(initialStreamUrl)
  const [activeTitle, setActiveTitle] = useState(initialTitle)
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number | undefined>(initialSeasonNumber)
  const [activeEpisodeNumber, setActiveEpisodeNumber] = useState<number | undefined>(initialEpisodeNumber)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showBottom, setShowBottom] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [cursorHidden, setCursorHidden] = useState(false)
  const [isHoveringControls, setIsHoveringControls] = useState(false)
  const [levels, setLevels] = useState<{ index: number; label: string; height: number }[]>([])
  const [currentLevel, setCurrentLevel] = useState(-1)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [previewX, setPreviewX] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [chatVisible, setChatVisible] = useState(() => !!messages)
  const [chatInputOpen, setChatInputOpen] = useState(false)
  const [chatText, setChatText] = useState('')
  const recentMessages = useRef<Set<string>>(new Set())

  const canGoNext = mediaType === 'tv' && activeSeasonNumber !== undefined && activeEpisodeNumber !== undefined && !!onNextEpisode

  const { saveProgress, clearProgress } = usePlaybackProgress()

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const relY = (e.clientY - rect.top) / rect.height
    const relX = (e.clientX - rect.left) / rect.width
    setShowBottom(relY > 0.7)
    setShowTop(relY < 0.15 && relX < 0.15)
    setCursorHidden(false)
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
    cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 5000)
  }, [])

  useEffect(() => {
    cursorTimerRef.current = setTimeout(() => setCursorHidden(true), 5000)
    return () => { if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current) }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    video.removeAttribute('src')

    if (type === 'direct') {
      video.src = activeStreamUrl
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false)
        video.play().catch(() => {})
      }, { once: true })
      return
    }

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
            level.height >= 2160
              ? '4K'
              : level.height >= 1080
                ? '1080p'
                : level.height >= 720
                  ? '720p'
                  : level.height >= 480
                    ? '480p'
                    : '360p',
          height: level.height,
        }))
        setLevels(lvls)
        setCurrentLevel(-1)
        setIsError(false)
        setIsBuffering(false)
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
            setIsError(true)
            break
        }
      })

      hls.loadSource(activeStreamUrl)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = activeStreamUrl
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false)
        video.play().catch(() => {})
      }, { once: true })
    } else {
      setIsError(true)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [activeStreamUrl, type])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onDurationChange = () => setDuration(video.duration || 0)
    const onPlay = () => { setIsPlaying(true); setIsBuffering(false) }
    const onPause = () => setIsPlaying(false)
    const onVolumeChange = () => {
      setIsMuted(video.muted)
      setVolume(video.volume)
    }
    const onWaiting = () => setIsBuffering(true)
    const onCanPlay = () => setIsBuffering(false)
    const onPlaying = () => setIsBuffering(false)
    const onEnded = () => {
      setIsPlaying(false)
      setIsFinished(true)
      clearProgress(tmdbId, mediaType, activeSeasonNumber, activeEpisodeNumber)
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('volumechange', onVolumeChange)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('ended', onEnded)

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('volumechange', onVolumeChange)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('ended', onEnded)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [tmdbId, mediaType, clearProgress, activeSeasonNumber, activeEpisodeNumber, canGoNext])

  useEffect(() => {
    if (activeStreamUrl === initialStreamUrl) {
      const video = videoRef.current
      if (!video || !initialPosition || initialPosition <= 0 || initialSeekDone.current) return

      const doSeek = () => {
        if (video && video.duration > 0 && !initialSeekDone.current) {
          video.currentTime = initialPosition
          initialSeekDone.current = true
        }
      }

      video.addEventListener('loadedmetadata', doSeek)
      video.addEventListener('canplay', doSeek, { once: true })

      return () => {
        video.removeEventListener('loadedmetadata', doSeek)
        video.removeEventListener('canplay', doSeek)
      }
    }
  }, [initialPosition, initialStreamUrl, activeStreamUrl])

  useEffect(() => {
    if (!isPlaying || !tmdbId) return
    saveTimerRef.current = setInterval(() => {
      const video = videoRef.current
      if (!video || !video.duration) return
      saveProgress(tmdbId, mediaType, video.currentTime, video.duration, activeTitle, activeSeasonNumber, activeEpisodeNumber)
    }, 30000)

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [isPlaying, tmdbId, mediaType, activeTitle, activeSeasonNumber, activeEpisodeNumber, saveProgress])

  const saveCurrentProgress = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.duration) return
    saveProgress(tmdbId, mediaType, video.currentTime, video.duration, activeTitle, activeSeasonNumber, activeEpisodeNumber)
  }, [tmdbId, mediaType, activeTitle, activeSeasonNumber, activeEpisodeNumber, saveProgress])

  useEffect(() => {
    return () => {
      saveCurrentProgress()
    }
  }, [saveCurrentProgress])

  const handleNextEpisode = useCallback(async () => {
    if (loadingNextRef.current || !onNextEpisode || activeSeasonNumber === undefined || activeEpisodeNumber === undefined) return
    loadingNextRef.current = true

    saveCurrentProgress()
    clearProgress(tmdbId, mediaType, activeSeasonNumber, activeEpisodeNumber)

    const result = await onNextEpisode(activeSeasonNumber, activeEpisodeNumber)
    if (!result) {
      loadingNextRef.current = false
      return
    }

    setActiveStreamUrl(result.url)
    setActiveSeasonNumber(result.seasonNumber)
    setActiveEpisodeNumber(result.episodeNumber)
    setActiveTitle(`${initialTitle} - S${result.seasonNumber} E${result.episodeNumber}`)
    setIsFinished(false)
    setIsError(false)
    setIsBuffering(false)
    setCurrentTime(0)
    setDuration(0)
    setLevels([])
    setCurrentLevel(-1)
    setIsPlaying(false)

    const video = videoRef.current
    if (video) {
      video.currentTime = 0
    }

    setTimeout(() => {
      videoRef.current?.play().catch(() => {})
    }, 100)

    loadingNextRef.current = false
  }, [onNextEpisode, activeSeasonNumber, activeEpisodeNumber, saveCurrentProgress, clearProgress, tmdbId, mediaType, initialTitle])

  const closeMenus = useCallback(() => {
    setShowSpeedMenu(false)
    setShowQualityMenu(false)
  }, [])

  const togglePlay = useCallback(() => {
    closeMenus()
    const video = videoRef.current
    if (!video) return
    if (video.paused) { video.play() } else { video.pause() }
  }, [closeMenus])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }, [])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const val = parseFloat(e.target.value)
    video.volume = val
    video.muted = val === 0
  }, [])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      container.requestFullscreen()
    }
  }, [])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    const video = videoRef.current
    if (!bar || !video || !duration) return

    const rect = bar.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    video.currentTime = fraction * duration
  }, [duration])

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    if (!bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setPreviewTime(fraction * duration)
    setPreviewX(e.clientX - rect.left)
  }, [duration])

  const handleLevelChange = useCallback((index: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = index
    setCurrentLevel(index)
    setShowQualityMenu(false)
  }, [])

  const skipBackward = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, video.currentTime - 10)
  }, [])

  const skipForward = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.min(video.duration, video.currentTime + 30)
  }, [])

  const handleSpeedSelect = useCallback((s: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = s
    setSpeed(s)
    setShowSpeedMenu(false)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const remaining = Math.max(0, duration - currentTime)

  const handleCloseWithSave = useCallback(() => {
    saveCurrentProgress()
    onClose()
  }, [saveCurrentProgress, onClose])

  const handleRetry = useCallback(() => {
    setIsError(false)
    setIsBuffering(false)
    setIsFinished(false)
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    const video = videoRef.current
    if (video) {
      video.removeAttribute('src')
    }
    const url = activeStreamUrl
    setActiveStreamUrl('')
    setTimeout(() => setActiveStreamUrl(url), 50)
  }, [activeStreamUrl])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        if (onSendChat) setChatInputOpen((v) => !v)
        return
      }
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'j':
          e.preventDefault()
          skipBackward()
          break
        case 'l':
          e.preventDefault()
          skipForward()
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
          if (isFullscreen) {
            e.preventDefault()
            document.exitFullscreen()
          }
          break
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [togglePlay, skipBackward, skipForward, toggleMute, toggleFullscreen, isFullscreen, onSendChat])

  useEffect(() => {
    const onClick = () => { setShowSpeedMenu(false); setShowQualityMenu(false) }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    const fill = (isMuted ? 0 : volume * 100).toFixed(0)
    if (!volumeStyleRef.current) {
      volumeStyleRef.current = document.createElement('style')
      document.head.appendChild(volumeStyleRef.current)
    }
    volumeStyleRef.current.textContent = `
      #${volumeSliderId} { -webkit-appearance: none; appearance: none; cursor: pointer; background: transparent; }
      #${volumeSliderId}::-webkit-slider-runnable-track { height: 4px; border-radius: 9999px; background: linear-gradient(to right, white ${fill}%, rgba(255,255,255,0.2) ${fill}%); }
      #${volumeSliderId}::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: white; margin-top: -4px; cursor: pointer; }
      #${volumeSliderId}::-moz-range-track { height: 4px; border-radius: 9999px; background: rgba(255,255,255,0.2); }
      #${volumeSliderId}::-moz-range-progress { height: 4px; border-radius: 9999px; background: white; }
      #${volumeSliderId}::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: white; border: none; cursor: pointer; }
    `
    return () => {
      if (volumeStyleRef.current) { volumeStyleRef.current.remove(); volumeStyleRef.current = null }
    }
  }, [volume, isMuted, volumeSliderId])

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-[cursor] duration-200 ${cursorHidden ? 'cursor-none' : 'cursor-auto'}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setShowBottom(false); setShowTop(false) }}
    >
      {isError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/80">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
          <div className="text-xl text-white">Playback Error</div>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="rounded-md bg-accent-600 px-6 py-2 text-sm text-white transition hover:bg-accent-500"
            >
              Retry
            </button>
            <button
              onClick={handleCloseWithSave}
              className="rounded-md bg-white/10 px-6 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Close Player
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster={posterUrl}
        playsInline
        onClick={togglePlay}
      >
        <track kind="captions" />
      </video>

      {isBuffering && isPlaying && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-white/30 border-t-white" />
        </div>
      )}

      {!isPlaying && !isBuffering && !isError && !isFinished && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <PlayIcon className="ml-1 h-10 w-10 text-white" />
          </div>
        </div>
      )}

      {isFinished && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60">
          <div className="rounded-full bg-white/10 p-4">
            <PlayIcon className="h-12 w-12 text-white" />
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
              }}
              className="rounded-full bg-white/10 px-6 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Watch Again
            </button>
            {canGoNext && (
              <button
                onClick={handleNextEpisode}
                className="inline-flex items-center gap-2 rounded-full bg-accent-600 px-6 py-2 text-sm text-white transition hover:bg-accent-500"
              >
                <ForwardIcon className="h-4 w-4" />
                Next Episode
              </button>
            )}
            <button
              onClick={handleCloseWithSave}
              className="rounded-full bg-white/10 px-6 py-2 text-sm text-white transition hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {chatVisible && messages && messages.length > 0 && (
        <div className="pointer-events-none absolute bottom-44 right-4 z-10 flex flex-col items-end gap-1.5">
          {messages.slice(-5).map((m) => {
            const age = Date.now() - m.timestamp
            const opacity = age > 8000 ? 0 : Math.max(0, 1 - (age - 4000) / 4000)
            return (
              <div
                key={m.id}
                className="pointer-events-auto w-56 rounded-xl bg-black/65 px-3 py-1.5 shadow-lg backdrop-blur"
                style={{ opacity, transition: 'opacity 1s ease-out' }}
              >
                {m.system ? (
                  <p className="text-[11px] text-slate-400 italic">{m.text}</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-semibold text-accent-300">{m.senderName}</span>
                      <span className="text-[9px] text-white/40">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-200">{m.text}</p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {chatInputOpen && onSendChat && (
        <div className="absolute bottom-24 right-4 z-20" onClick={() => setChatInputOpen(false)}>
          <div className="pointer-events-auto rounded-xl bg-black/80 px-3 py-2.5 shadow-lg backdrop-blur" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (!chatText.trim()) { setChatInputOpen(false); return }
              onSendChat(chatText.trim())
              setChatText('')
              setChatInputOpen(false)
            }}>
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Type a message..."
                autoFocus
                className="w-48 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white placeholder-white/40 outline-none ring-1 ring-white/20 focus:ring-accent-500"
              />
            </form>
          </div>
        </div>
      )}

      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${
          showBottom ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute left-0 right-0 top-0 flex items-center gap-3 px-4 pt-4 transition-opacity duration-300 ${
          showTop ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={handleCloseWithSave}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        <span className="text-sm font-semibold text-white drop-shadow-lg">{activeTitle}</span>
      </div>

      {onResync && !isHost && (
        <div className="pointer-events-auto absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
          {drift === null ? (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-500" />
              <span className="text-[10px] text-gray-400">Calculating</span>
            </div>
          ) : (() => {
            const d = drift!
            return (
              <>
                <div className={`h-1.5 w-1.5 rounded-full ${
                  Math.abs(d) < 2 ? 'bg-green-500' : Math.abs(d) < 10 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-[10px] text-white/70">
                  {hostPaused ? `Paused ${d > 0 ? `+${d}s` : `${d}s`}` : `${d > 0 ? '+' : ''}${d}s`}
                </span>
                <button onClick={onResync} className="rounded p-0.5 text-accent-400 hover:bg-white/10" title="Resync to host">
                  <ArrowsRightLeftIcon className="h-3 w-3" />
                </button>
                <button onClick={onToggleDetach} className="rounded p-0.5 text-white/50 hover:text-white" title={isDetached ? 'Reattach' : 'Detach'}>
                  {isDetached ? <LinkIcon className="h-3 w-3" /> : <LinkSlashIcon className="h-3 w-3" />}
                </button>
              </>
            )
          })()}
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showBottom ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
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
                className="absolute left-0 top-0 h-full rounded-full bg-red-600 transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-0 h-full rounded-full bg-white/20 transition-all"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 scale-0 rounded-full bg-red-600 transition-transform group-hover:scale-100" />
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
              className="pointer-events-auto rounded-full p-1.5 text-white/90 transition hover:bg-white/10 hover:text-white"
              title={isPlaying ? 'Pause (k)' : 'Play (k)'}
            >
              {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            </button>

            <button
              onClick={skipBackward}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Back 10s (j)"
            >
              <ArrowUturnLeftIcon className="h-5 w-5" />
            </button>

            <button
              onClick={skipForward}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Forward 30s (l)"
            >
              <ArrowUturnRightIcon className="h-5 w-5" />
            </button>

            <button
              onClick={toggleMute}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
            >
              {isMuted || volume === 0 ? (
                <SpeakerXMarkIcon className="h-4 w-4" />
              ) : (
                <SpeakerWaveIcon className="h-4 w-4" />
              )}
            </button>

            <div className="flex items-center gap-1">
              <input
                type="range"
                id={volumeSliderId}
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            <span className="pointer-events-none select-none text-xs text-white/60">
              {formatTime(currentTime)} / {formatTime(duration)}
              {remaining > 0 && (
                <span className="ml-1 text-white/40">-{formatTime(remaining)}</span>
              )}
            </span>

            {canGoNext && !isFinished && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextEpisode() }}
                className="pointer-events-auto rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                title="Next episode"
              >
                <ForwardIcon className="h-4 w-4" />
              </button>
            )}

            <div className="flex-1" />

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSpeedMenu(!showSpeedMenu)
                  setShowQualityMenu(false)
                }}
                className="pointer-events-auto rounded-md px-2 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                title="Playback speed"
              >
                {speed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 min-w-[88px] overflow-hidden rounded-lg bg-black/90 shadow-lg backdrop-blur-md">
                  {PLAYBACK_SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); handleSpeedSelect(s) }}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-white/10 ${
                        speed === s ? 'font-bold text-white' : 'text-white/60'
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
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowQualityMenu(!showQualityMenu)
                    setShowSpeedMenu(false)
                  }}
                  className="pointer-events-auto rounded-md px-2 py-1 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                  title="Quality"
                >
                  {currentLevel === -1
                    ? 'Auto'
                    : levels.find((l) => l.index === currentLevel)?.label ?? 'Auto'}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 min-w-[120px] overflow-hidden rounded-lg bg-black/90 shadow-lg backdrop-blur-md">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLevelChange(-1) }}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition hover:bg-white/10 ${
                        currentLevel === -1 ? 'font-bold text-white' : 'text-white/60'
                      }`}
                    >
                      Auto
                    </button>
                    {levels.map((level) => (
                      <button
                        key={level.index}
                        onClick={(e) => { e.stopPropagation(); handleLevelChange(level.index) }}
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

            {onSendChat && (
              <button
                onClick={() => setChatVisible((v) => !v)}
                className={`pointer-events-auto rounded-full p-1.5 transition hover:bg-white/10 ${
                  chatVisible ? 'text-accent-400' : 'text-white/70 hover:text-white'
                }`}
                title="Chat (T)"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="pointer-events-auto rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              title={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="h-4 w-4" />
              ) : (
                <ArrowsPointingOutIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
