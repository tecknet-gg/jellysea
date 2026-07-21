export interface AuthenticationResult {
  AccessToken: string
  User: JellyfinUser
  SessionInfo: SessionInfo
}

export interface JellyfinUser {
  Id: string
  Name: string
  ServerId: string
  HasPassword: boolean
  Policy: UserPolicy
}

export interface UserPolicy {
  IsAdministrator: boolean
  IsDisabled: boolean
}

export interface SessionInfo {
  Id: string
  UserId: string
  Client: string
  DeviceName: string
  DeviceId: string
}

export interface JellyfinItem {
  Id: string
  Name: string
  Type: string
  ServerId: string
  ParentId: string
  Path: string
  MediaType: string
  ProductionYear?: number
  PremiereDate?: string
  ProviderIds: Record<string, string>
  SeriesId?: string
  SeriesName?: string
  SeasonId?: string
  SeasonName?: string
  IndexNumber?: number
  ParentIndexNumber?: number
  ImageTags: Record<string, string>
  BackdropImageTags: string[]
  Overview?: string
  RunTimeTicks?: number
  UserData?: UserData
  MediaSources?: MediaSourceInfo[]
}

export interface UserData {
  PlaybackPositionTicks: number
  Played: boolean
  IsFavorite: boolean
  LastPlayedDate?: string
}

export interface ItemsResponse {
  Items: JellyfinItem[]
  TotalRecordCount: number
}

export interface PlaybackInfoResponse {
  MediaSources: MediaSourceInfo[]
  PlaySessionId: string
}

export interface MediaSourceInfo {
  Id: string
  Name: string
  Path: string
  Protocol: string
  Container: string
  RunTimeTicks: number
  VideoType: string
  MediaStreams: MediaStream[]
  DefaultAudioStreamIndex?: number
  DirectStreamUrl?: string
  SupportsDirectPlay: boolean
  SupportsDirectStream: boolean
  SupportsTranscoding: boolean
  TranscodingUrl?: string
}

export interface MediaStream {
  Type: string
  Index: number
  Codec: string
  Profile?: string
  DisplayTitle?: string
  Language?: string
  IsDefault: boolean
  IsExternal: boolean
  Height?: number
  Width?: number
  BitRate?: number
  Level?: number
}

export interface DeviceProfile {
  MaxStreamingBitrate: number
  MaxStaticBitrate: number
  MusicStreamingTranscodingBitrate: number
  DirectPlayProfiles: DirectPlayProfile[]
  TranscodingProfiles: TranscodingProfile[]
  CodecProfiles: CodecProfile[]
  SubtitleProfiles: SubtitleProfile[]
}

export interface DirectPlayProfile {
  Container: string
  Type: string
  VideoCodec?: string
  AudioCodec?: string
}

export interface TranscodingProfile {
  Container: string
  Type: string
  VideoCodec: string
  AudioCodec: string
  Context: string
  Protocol: string
  MaxAudioChannels?: string
  MinSegments?: number
  BreakOnNonKeyFrames?: boolean
}

export interface CodecProfile {
  Type: string
  Codec: string
  Conditions: CodecCondition[]
}

export interface CodecCondition {
  Property: string
  Condition: string
  Value: string
}

export interface SubtitleProfile {
  Format: string
  Method: string
}
