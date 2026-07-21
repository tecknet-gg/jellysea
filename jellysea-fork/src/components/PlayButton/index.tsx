'use client'

import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PlayIcon } from '@heroicons/react/24/outline'
import useJellyfinStream from '@app/hooks/useJellyfinStream'
import type { ResolveResult, ResolveNextResult } from '@app/hooks/useJellyfinStream'
import VideoPlayer from '@app/components/VideoPlayer'
import { usePlayer } from '@app/context/PlayerContext'
import toast from 'react-hot-toast'

interface PlayButtonProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  is4k?: boolean
  title: string
  posterPath?: string
  backdropPath?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  resumePosition?: number
  seasonNumber?: number
  episodeNumber?: number
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export default function PlayButton({
  tmdbId,
  mediaType,
  is4k = false,
  title,
  posterPath,
  className = '',
  size = 'md',
  resumePosition,
  seasonNumber: inputSeasonNumber,
  episodeNumber: inputEpisodeNumber,
}: PlayButtonProps) {
  const [showPlayer, setShowPlayer] = useState(false)
  const [currentType, setCurrentType] = useState<'direct' | 'hls'>('hls')
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [resolvedSeasonNumber, setResolvedSeasonNumber] = useState<number | undefined>(inputSeasonNumber)
  const [resolvedEpisodeNumber, setResolvedEpisodeNumber] = useState<number | undefined>(inputEpisodeNumber)
  const resolvingRef = useRef(false)
  const { setPlayerActive } = usePlayer()
  const { isLoading, resolve, resolveNext, reset } = useJellyfinStream(
    tmdbId,
    mediaType,
    is4k,
    inputSeasonNumber,
    inputEpisodeNumber
  )

  const handlePlay = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (resolvingRef.current) return
    resolvingRef.current = true
    try {
      const result: ResolveResult = await resolve()
      if (result.url) {
        setCurrentType(result.type)
        setCurrentUrl(result.url)
        if (result.seasonNumber) setResolvedSeasonNumber(result.seasonNumber)
        if (result.episodeNumber) setResolvedEpisodeNumber(result.episodeNumber)
        setShowPlayer(true)
        setPlayerActive(true)
      } else {
        toast.error(result.error ?? 'Unable to start playback')
      }
    } finally {
      resolvingRef.current = false
    }
  }, [resolve, setPlayerActive])

  const handleNextEpisode = useCallback(
    async (currentSeason: number, currentEpisode: number): Promise<ResolveNextResult> => {
      const result = await resolveNext(currentSeason, currentEpisode)
      if (result) {
        setCurrentType(result.type)
        setCurrentUrl(result.url)
        setResolvedSeasonNumber(result.seasonNumber)
        setResolvedEpisodeNumber(result.episodeNumber)
      }
      return result
    },
    [resolveNext]
  )

  const handleClose = useCallback(() => {
    setShowPlayer(false)
    setCurrentUrl(null)
    setPlayerActive(false)
    reset()
  }, [reset, setPlayerActive])

  const episodeLabel =
    mediaType === 'tv' && inputSeasonNumber !== undefined && inputEpisodeNumber !== undefined
      ? `S${inputSeasonNumber} E${inputEpisodeNumber}`
      : null

  return (
    <>
      <button
        onClick={handlePlay}
        disabled={isLoading}
        className={`inline-flex items-center rounded-full font-semibold text-white transition-all ${
          isLoading
            ? 'cursor-wait bg-green-500/60'
            : 'bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-100'
        } ${sizeClasses[size]} ${className}`}
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white/30 border-t-white" />
        ) : (
          <PlayIcon className={iconSizes[size]} />
        )}
        <span>
          {isLoading
            ? 'Resolving...'
            : episodeLabel
              ? `Play ${episodeLabel}`
              : 'Play'}
        </span>
      </button>

      {showPlayer && currentUrl && typeof document !== 'undefined' && createPortal(
        <VideoPlayer
          type={currentType}
          streamUrl={currentUrl}
          title={episodeLabel ? `${title} - ${episodeLabel}` : title}
          posterUrl={
            posterPath
              ? `https://image.tmdb.org/t/p/w780${posterPath}`
              : undefined
          }
          initialPosition={resumePosition}
          tmdbId={tmdbId}
          mediaType={mediaType}
          seasonNumber={resolvedSeasonNumber}
          episodeNumber={resolvedEpisodeNumber}
          onNextEpisode={
            mediaType === 'tv' ? handleNextEpisode : undefined
          }
          onClose={handleClose}
        />,
        document.body
      )}
    </>
  )
}
