import jellyfinApi from './client'
import { getStoredCredentials } from './auth'
import type { JellyfinItem, ItemsResponse } from './types'

function userId(): string {
  const { userId } = getStoredCredentials()
  if (!userId) throw new Error('Not authenticated with Jellyfin')
  return userId
}

export async function searchByTmdbId(
  tmdbId: number,
  type: 'Movie' | 'Series'
): Promise<JellyfinItem | null> {
  const uid = userId()
  const res = await jellyfinApi.get<ItemsResponse>(`/Users/${uid}/Items`, {
    params: {
      includeItemTypes: type,
      recursive: true,
      fields: 'ProviderIds,Path,MediaSources',
      anyProviderIdEquals: `tmdb:${tmdbId}`,
    },
  })

  return res.data.Items?.[0] ?? null
}

export async function searchEpisodesByTmdbId(
  tmdbId: number
): Promise<JellyfinItem | null> {
  const uid = userId()
  const res = await jellyfinApi.get<ItemsResponse>(`/Users/${uid}/Items`, {
    params: {
      includeItemTypes: 'Episode',
      recursive: true,
      fields: 'ProviderIds,Path,MediaSources',
      anyProviderIdEquals: `tmdb:${tmdbId}`,
    },
  })

  return res.data.Items?.[0] ?? null
}

export async function getItemById(itemId: string): Promise<JellyfinItem> {
  const uid = userId()
  const res = await jellyfinApi.get<JellyfinItem>(`/Users/${uid}/Items/${itemId}`)
  return res.data
}

export async function getSeasons(seriesId: string): Promise<JellyfinItem[]> {
  const uid = userId()
  const res = await jellyfinApi.get<ItemsResponse>(`/Shows/${seriesId}/Seasons`, {
    params: { userId: uid, fields: 'ProviderIds,ItemCounts' },
  })
  return res.data.Items
}

export async function getEpisodes(
  seriesId: string,
  seasonNumber: number
): Promise<JellyfinItem[]> {
  const uid = userId()
  const res = await jellyfinApi.get<ItemsResponse>(`/Shows/${seriesId}/Episodes`, {
    params: {
      userId: uid,
      seasonNumber,
      fields: 'ProviderIds,MediaSources,Overview',
    },
  })
  return res.data.Items
}

export async function getEpisodeByIndex(
  seriesId: string,
  seasonNumber: number,
  episodeNumber: number
): Promise<JellyfinItem | null> {
  const episodes = await getEpisodes(seriesId, seasonNumber)
  return episodes.find((ep) => ep.IndexNumber === episodeNumber) ?? null
}
