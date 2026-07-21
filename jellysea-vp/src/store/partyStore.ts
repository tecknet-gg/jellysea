export interface Party {
  id: string
  name: string
  hasPassword: boolean
  passwordHash?: string
  hostId: string
  hostName: string
  hostAvatar?: string
  bannedUserIds: string[]
  bannedUsers: { userId: string; displayName: string }[]
  media?: {
    tmdbId: number
    mediaType: 'movie' | 'tv'
    title: string
    posterPath?: string
    backdropPath?: string
    overview?: string
    seasonNumber?: number
    episodeNumber?: number
  }
  status: PartyStatus
  memberCount: number
  createdAt: number
}

export type PartyStatus = 'waiting' | 'ready' | 'watching' | 'paused'

export interface CreatePartyRequest {
  name: string
  password?: string
  hostId: string
  hostName: string
  hostAvatar?: string
}
