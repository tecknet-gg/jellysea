export type PartyStatus = 'waiting' | 'ready' | 'watching' | 'paused'

export interface PartyMedia {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
  posterPath?: string
  backdropPath?: string
  overview?: string
  seasonNumber?: number
  episodeNumber?: number
}

export interface Party {
  id: string
  name: string
  hasPassword: boolean
  hostId: string
  hostName: string
  hostAvatar?: string
  media?: PartyMedia
  status: PartyStatus
  memberCount: number
  createdAt: number
}

export interface CreatePartyRequest {
  name: string
  password?: string
  hostId: string
  hostName: string
  hostAvatar?: string
}
