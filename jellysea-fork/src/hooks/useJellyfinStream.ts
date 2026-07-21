'use client'

import api from '@app/utils/api'
import { useState, useCallback, useRef } from 'react'

interface StreamResponse {
  type: 'direct' | 'hls'
  url: string
  itemId: string
  seasonNumber?: number
  episodeNumber?: number
}

export type ResolveResult = { type: 'direct' | 'hls'; url: string | null; error: string | null; itemId?: string; seasonNumber?: number; episodeNumber?: number }

export type ResolveNextResult = { type: 'direct' | 'hls'; url: string; itemId: string; seasonNumber: number; episodeNumber: number } | null

interface UseJellyfinStreamResult {
  isLoading: boolean
  error: string | null
  resolve: () => Promise<ResolveResult>
  resolveNext: (currentSeason: number, currentEpisode: number) => Promise<ResolveNextResult>
  reset: () => void
}

export default function useJellyfinStream(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  is4k = false,
  seasonNumber?: number,
  episodeNumber?: number
): UseJellyfinStreamResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const resolve = useCallback(async (): Promise<ResolveResult> => {
    if (loadingRef.current) return { type: 'hls', url: null, error: null }

    loadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const params: Record<string, string | boolean | number> = { is4k, mediaType }
      if (seasonNumber !== undefined) params.seasonNumber = seasonNumber
      if (episodeNumber !== undefined) params.episodeNumber = episodeNumber

      const { data } = await api.get<StreamResponse>(
        `/media/${tmdbId}/play`,
        { params }
      )
      return { type: data.type, url: data.url, error: null, itemId: data.itemId, seasonNumber: data.seasonNumber, episodeNumber: data.episodeNumber }
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to resolve stream URL'
      setError(message)
      return { type: 'hls', url: null, error: message }
    } finally {
      loadingRef.current = false
      setIsLoading(false)
    }
  }, [tmdbId, mediaType, is4k, seasonNumber, episodeNumber])

  const resolveNext = useCallback(
    async (currentSeason: number, currentEpisode: number): Promise<ResolveNextResult> => {
      try {
        const { data } = await api.get<StreamResponse>(`/media/${tmdbId}/play`, {
          params: { is4k, mediaType, seasonNumber: currentSeason, episodeNumber: currentEpisode, next: true },
        })
        if (!data.seasonNumber || !data.episodeNumber) return null
        return { type: data.type, url: data.url, itemId: data.itemId, seasonNumber: data.seasonNumber, episodeNumber: data.episodeNumber }
      } catch {
        return null
      }
    },
    [tmdbId, mediaType, is4k]
  )

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return { isLoading, error, resolve, resolveNext, reset }
}
