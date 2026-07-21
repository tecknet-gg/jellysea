import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { PlayIcon } from '@heroicons/react/24/solid'
import api from '@/utils/api'

interface PlayButtonProps {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  seasonNumber?: number
  episodeNumber?: number
  className?: string
}

export default function PlayButton({
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
  className = '',
}: PlayButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePlay = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: Record<string, string | number | boolean> = { mediaType, is4k: false }
      if (seasonNumber !== undefined) params.seasonNumber = seasonNumber
      if (episodeNumber !== undefined) params.episodeNumber = episodeNumber

      const { data } = await api.get<{
        streamUrl: string
        hlsStreamUrl: string
        itemId: string
        seasonNumber?: number
        episodeNumber?: number
      }>(`/media/${tmdbId}/play`, { params })

      if (!data.itemId) {
        setError('Media not found in Jellyfin')
        setLoading(false)
        return
      }

      const query = new URLSearchParams({
        title: '',
        ...(data.seasonNumber ? { season: String(data.seasonNumber) } : {}),
        ...(data.episodeNumber ? { episode: String(data.episodeNumber) } : {}),
        tmdbId: String(tmdbId),
        mediaType,
      })

      router.push(`/watch/${data.itemId}?${query.toString()}`)
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to start playback'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [tmdbId, mediaType, seasonNumber, episodeNumber, router])

  return (
    <div>
      <button
        onClick={handlePlay}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
        ) : (
          <PlayIcon className="h-4 w-4" />
        )}
        {seasonNumber != null ? 'Play Episode' : mediaType === 'movie' ? 'Play' : 'Play Series'}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

export function PlayEpisodeButton({
  tmdbId,
  seasonNumber,
  episodeNumber,
  episodeTitle,
}: {
  tmdbId: number
  seasonNumber: number
  episodeNumber: number
  episodeTitle?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <button
      onClick={async () => {
        setLoading(true)
        try {
          const { data } = await api.get<{ itemId: string; seasonNumber?: number; episodeNumber?: number }>(
            `/media/${tmdbId}/play`,
            { params: { mediaType: 'tv', is4k: false, seasonNumber, episodeNumber } }
          )
          if (data.itemId) {
            const query = new URLSearchParams({
              ...(data.seasonNumber ? { season: String(data.seasonNumber) } : { season: String(seasonNumber) }),
              ...(data.episodeNumber ? { episode: String(data.episodeNumber) } : { episode: String(episodeNumber) }),
              ...(episodeTitle ? { title: encodeURIComponent(episodeTitle) } : {}),
              tmdbId: String(tmdbId),
              mediaType: 'tv',
            })
            router.push(`/watch/${data.itemId}?${query.toString()}`)
          }
        } catch {
          /* ignore */
        }
        setLoading(false)
      }}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-full bg-indigo-600/80 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
    >
      {loading ? (
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
      ) : (
        <PlayIcon className="h-3 w-3" />
      )}
      Play
    </button>
  )
}
