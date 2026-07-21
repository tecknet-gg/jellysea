export { default as jellyfinApi } from './client'

export {
  authenticateWithJellyfin,
  getStoredCredentials,
  clearCredentials,
} from './auth'

export {
  searchByTmdbId,
  searchEpisodesByTmdbId,
  getItemById,
  getSeasons,
  getEpisodes,
  getEpisodeByIndex,
} from './items'

export {
  getPlaybackInfo,
  buildDirectStreamUrl,
  buildHlsStreamUrl,
  buildStreamUrl,
  getPreferredMediaSource,
} from './playback'

export type * from './types'
