'use client'

import { useCallback } from 'react'

export interface PlaybackProgress {
  position: number
  duration: number
  title: string
  updatedAt: string
  seasonNumber?: number
  episodeNumber?: number
}

export interface LastEpisode {
  seasonNumber: number
  episodeNumber: number
  position: number
}

const STORAGE_PREFIX = 'jellysea_progress_'
const LAST_TV_PREFIX = 'jellysea_last_tv_'

export default function usePlaybackProgress() {
  const getKey = useCallback((
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    seasonNumber?: number,
    episodeNumber?: number
  ) => {
    if (mediaType === 'tv' && seasonNumber !== undefined && episodeNumber !== undefined) {
      return `${STORAGE_PREFIX}${tmdbId}_${mediaType}_S${seasonNumber}_E${episodeNumber}`
    }
    return `${STORAGE_PREFIX}${tmdbId}_${mediaType}`
  }, [])

  const getLastTvKey = useCallback((tmdbId: number) => {
    return `${LAST_TV_PREFIX}${tmdbId}`
  }, [])

  const saveProgress = useCallback(
    (
      tmdbId: number,
      mediaType: 'movie' | 'tv',
      position: number,
      duration: number,
      title: string,
      seasonNumber?: number,
      episodeNumber?: number
    ) => {
      try {
        const data: PlaybackProgress = {
          position,
          duration,
          title,
          updatedAt: new Date().toISOString(),
          ...(seasonNumber !== undefined && { seasonNumber }),
          ...(episodeNumber !== undefined && { episodeNumber }),
        }
        localStorage.setItem(getKey(tmdbId, mediaType, seasonNumber, episodeNumber), JSON.stringify(data))

        if (mediaType === 'tv' && seasonNumber !== undefined && episodeNumber !== undefined) {
          const last: LastEpisode = { seasonNumber, episodeNumber, position }
          localStorage.setItem(getLastTvKey(tmdbId), JSON.stringify(last))
        }
      } catch {
        // localStorage might be full or unavailable
      }
    },
    [getKey, getLastTvKey]
  )

  const loadProgress = useCallback(
    (
      tmdbId: number,
      mediaType: 'movie' | 'tv',
      seasonNumber?: number,
      episodeNumber?: number
    ): PlaybackProgress | null => {
      try {
        const raw = localStorage.getItem(getKey(tmdbId, mediaType, seasonNumber, episodeNumber))
        if (!raw) return null
        const data = JSON.parse(raw) as PlaybackProgress
        if (typeof data.position !== 'number' || typeof data.duration !== 'number') return null
        return data
      } catch {
        return null
      }
    },
    [getKey]
  )

  const loadLastEpisode = useCallback(
    (tmdbId: number): LastEpisode | null => {
      try {
        const raw = localStorage.getItem(getLastTvKey(tmdbId))
        if (!raw) {
          const fallback = loadProgress(tmdbId, 'tv')
          if (!fallback) return null
          return {
            seasonNumber: fallback.seasonNumber ?? 1,
            episodeNumber: fallback.episodeNumber ?? 1,
            position: fallback.position,
          }
        }
        const data = JSON.parse(raw) as LastEpisode
        if (typeof data.seasonNumber !== 'number' || typeof data.episodeNumber !== 'number') return null
        return data
      } catch {
        return null
      }
    },
    [getLastTvKey, loadProgress]
  )

  const clearProgress = useCallback(
    (
      tmdbId: number,
      mediaType: 'movie' | 'tv',
      seasonNumber?: number,
      episodeNumber?: number
    ) => {
      try {
        localStorage.removeItem(getKey(tmdbId, mediaType, seasonNumber, episodeNumber))
      } catch {
        // ignore
      }
    },
    [getKey]
  )

  const getAllProgress = useCallback((): { tmdbId: number; mediaType: 'movie' | 'tv'; progress: PlaybackProgress; seasonNumber?: number; episodeNumber?: number }[] => {
    try {
      const results: { tmdbId: number; mediaType: 'movie' | 'tv'; progress: PlaybackProgress; seasonNumber?: number; episodeNumber?: number }[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith(STORAGE_PREFIX)) continue
        const rest = key.slice(STORAGE_PREFIX.length)

        const epMatch = rest.match(/^(\d+)_tv_S(\d+)_E(\d+)$/)
        if (epMatch) {
          const [, tmdbIdStr, seasonStr, episodeStr] = epMatch
          const tmdbId = parseInt(tmdbIdStr, 10)
          const seasonNumber = parseInt(seasonStr, 10)
          const episodeNumber = parseInt(episodeStr, 10)
          if (isNaN(tmdbId) || isNaN(seasonNumber) || isNaN(episodeNumber)) continue
          try {
            const raw = localStorage.getItem(key)
            if (!raw) continue
            const progress = JSON.parse(raw) as PlaybackProgress
            if (typeof progress.position !== 'number') continue
            results.push({ tmdbId, mediaType: 'tv', seasonNumber, episodeNumber, progress })
          } catch {
            continue
          }
          continue
        }

        const simpleMatch = rest.match(/^(\d+)_(movie|tv)$/)
        if (simpleMatch) {
          const [, tmdbIdStr, mediaType] = simpleMatch
          const tmdbId = parseInt(tmdbIdStr, 10)
          if (isNaN(tmdbId)) continue
          try {
            const raw = localStorage.getItem(key)
            if (!raw) continue
            const progress = JSON.parse(raw) as PlaybackProgress
            if (typeof progress.position !== 'number') continue
            results.push({ tmdbId, mediaType: mediaType as 'movie' | 'tv', progress })
          } catch {
            continue
          }
        }
      }
      return results
    } catch {
      return []
    }
  }, [])

  return { saveProgress, loadProgress, loadLastEpisode, clearProgress, getAllProgress }
}
