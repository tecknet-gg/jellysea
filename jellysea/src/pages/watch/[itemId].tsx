import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import VideoPlayer from '@/components/Player/VideoPlayer'
import {
  getPlaybackInfo,
  buildStreamUrl,
  getPreferredMediaSource,
  getSeasons,
  getEpisodes,
  getItemById,
} from '@/lib/jellyfin'
const STORAGE_PREFIX = 'jellysea_progress_'

function loadProgress(tmdbId?: number, mediaType?: string, seasonNumber?: number, episodeNumber?: number): number | undefined {
  if (!tmdbId || !mediaType) return undefined
  try {
    const key = mediaType === 'tv' && seasonNumber !== undefined && episodeNumber !== undefined
      ? `${STORAGE_PREFIX}${tmdbId}_${mediaType}_S${seasonNumber}_E${episodeNumber}`
      : `${STORAGE_PREFIX}${tmdbId}_${mediaType}`
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    const data = JSON.parse(raw)
    if (typeof data.position !== 'number') return undefined
    return data.position
  } catch {
    return undefined
  }
}

function PlaybackLoader({
  itemId,
  season,
  episode,
  tmdbId,
  mediaType,
}: {
  itemId: string
  season?: number
  episode?: number
  tmdbId?: number
  mediaType?: string
}) {
  const [itemName, setItemName] = useState<string>('')

  const {
    data: playbackData,
    error: playbackError,
    isValidating,
  } = useSWR(
    ['playback', itemId, season, episode],
    async () => {
      let targetItemId = itemId

      if (season != null && episode != null) {
        const seasons = await getSeasons(itemId)
        const seasonItem = seasons.find((s) => s.IndexNumber === season)
        if (!seasonItem) throw new Error('Season not found')
        const episodes = await getEpisodes(itemId, season)
        const ep = episodes.find((e) => e.IndexNumber === episode)
        if (!ep) throw new Error('Episode not found')
        targetItemId = ep.Id
      }

      const [info, item] = await Promise.all([
        getPlaybackInfo(targetItemId),
        getItemById(targetItemId).catch(() => null),
      ])

      const source = getPreferredMediaSource(info)
      if (!source) throw new Error('No playable media source found')
      const { url, isHls } = buildStreamUrl(targetItemId, source)
      return {
        streamUrl: url,
        mediaSource: source,
        resolvedItemId: targetItemId,
        isHls,
        itemName: item?.Name ?? '',
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  )

  useEffect(() => {
    if (playbackData?.itemName) {
      setItemName(playbackData.itemName)
    }
  }, [playbackData?.itemName])

  if (isValidating && !playbackData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="text-center">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-solid border-white/20 border-t-white" />
          <p className="text-sm text-white/60">Loading playback info...</p>
        </div>
      </div>
    )
  }

  if (playbackError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="text-center text-white">
          <p className="mb-2 text-lg">
            {playbackError instanceof Error ? playbackError.message : 'Failed to load playback'}
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur hover:bg-white/20"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  if (!playbackData) return null

  const resumePos = loadProgress(tmdbId, mediaType, season, episode)

  const handleNextEpisode = async () => {
    if (season == null || episode == null) return
    window.location.href = `/watch/${itemId}?season=${season}&episode=${episode + 1}&tmdbId=${tmdbId ?? ''}&mediaType=${mediaType ?? 'tv'}`
  }

  return (
    <VideoPlayer
      streamUrl={playbackData.streamUrl}
      itemId={playbackData.resolvedItemId}
      title={itemName}
      tmdbId={tmdbId}
      mediaType={mediaType as 'movie' | 'tv'}
      seasonNumber={season}
      episodeNumber={episode}
      initialPosition={resumePos}
      onEnded={() => {
        if (window.history.length > 1) window.history.back()
        else window.location.href = '/'
      }}
      onNextEpisode={season != null && episode != null ? handleNextEpisode : undefined}
    />
  )
}

export default function WatchPage() {
  const router = useRouter()
  const { itemId, season, episode, tmdbId, mediaType } = router.query
  const [showOverlay, setShowOverlay] = useState(true)
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    }
  }, [])

  if (!itemId || typeof itemId !== 'string') {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <p>No media selected</p>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onMouseMove={() => {
        setShowOverlay(true)
        if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
        overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 3000)
      }}
      onMouseLeave={() => setShowOverlay(false)}
    >
      <div
        className={`absolute left-0 right-0 top-0 z-10 transition-opacity duration-300 ${
          showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 pb-8 pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            {season != null && episode != null && (
              <span className="text-xs text-white/50">
                S{String(season).padStart(2, '0')}E{String(episode).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <PlaybackLoader
          itemId={itemId as string}
          season={season ? Number(season) : undefined}
          episode={episode ? Number(episode) : undefined}
          tmdbId={tmdbId ? Number(tmdbId) : undefined}
          mediaType={typeof mediaType === 'string' ? mediaType : undefined}
        />
      </div>
    </div>
  )
}
