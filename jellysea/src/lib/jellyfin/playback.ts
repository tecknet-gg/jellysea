import jellyfinApi from './client'
import { getStoredCredentials } from './auth'
import type { PlaybackInfoResponse, MediaSourceInfo, DeviceProfile } from './types'

const deviceProfile: DeviceProfile = {
  MaxStreamingBitrate: 400000000,
  MaxStaticBitrate: 400000000,
  MusicStreamingTranscodingBitrate: 192000,
  DirectPlayProfiles: [
    { Container: 'mp4,mkv,webm,ts,avi,mov', Type: 'Video' },
    { Container: 'mp3,flac,ogg,wav,aac,wma', Type: 'Audio' },
  ],
  TranscodingProfiles: [
    {
      Container: 'ts',
      Type: 'Video',
      VideoCodec: 'h264',
      AudioCodec: 'aac,mp3,ac3,eac3,opus,flac',
      Context: 'Streaming',
      Protocol: 'hls',
      MaxAudioChannels: '6',
      MinSegments: 1,
      BreakOnNonKeyFrames: false,
    },
  ],
  CodecProfiles: [],
  SubtitleProfiles: [{ Format: 'vtt', Method: 'Hls' }],
}

export async function getPlaybackInfo(
  itemId: string
): Promise<PlaybackInfoResponse> {
  const { accessToken, userId } = getStoredCredentials()
  const res = await jellyfinApi.post<PlaybackInfoResponse>(
    `/Items/${itemId}/PlaybackInfo`,
    { DeviceProfile: deviceProfile },
    {
      params: {
        userId,
        api_key: accessToken,
      },
    }
  )
  return res.data
}

export function buildDirectStreamUrl(
  itemId: string,
  mediaSourceId: string
): string {
  const { accessToken } = getStoredCredentials()
  return `/api/jf/Videos/${itemId}/stream?static=true&mediaSourceId=${mediaSourceId}&api_key=${accessToken}`
}

export function buildHlsStreamUrl(
  itemId: string,
  mediaSource: MediaSourceInfo
): string {
  const { accessToken } = getStoredCredentials()
  const params = new URLSearchParams({
    api_key: accessToken!,
    mediaSourceId: mediaSource.Id,
    VideoCodec: 'h264',
    AudioCodec: 'aac',
    AudioStreamIndex: String(mediaSource.DefaultAudioStreamIndex ?? 0),
    TranscodeReasons: 'VideoCodecNotSupported',
  })

  if (mediaSource.RunTimeTicks) {
    params.set('StartTimeTicks', '0')
  }

  return `/api/jf/Videos/${itemId}/main.m3u8?${params.toString()}`
}

export function buildStreamUrl(
  itemId: string,
  mediaSource: MediaSourceInfo
): { url: string; isHls: boolean } {
  if (mediaSource.SupportsDirectPlay) {
    return { url: buildDirectStreamUrl(itemId, mediaSource.Id), isHls: false }
  }

  if (mediaSource.TranscodingUrl) {
    const transcodePath = mediaSource.TranscodingUrl.startsWith('/')
      ? mediaSource.TranscodingUrl
      : `/${mediaSource.TranscodingUrl}`
    return { url: `/api/jf${transcodePath}${transcodePath.includes('?') ? '&' : '?'}api_key=${getStoredCredentials().accessToken}`, isHls: false }
  }

  return { url: buildHlsStreamUrl(itemId, mediaSource), isHls: true }
}

export function getPreferredMediaSource(
  playbackInfo: PlaybackInfoResponse
): MediaSourceInfo | null {
  const sources = playbackInfo.MediaSources ?? []
  const prioritized = [...sources].sort((a, b) => {
    if (a.SupportsDirectPlay && !b.SupportsDirectPlay) return -1
    if (!a.SupportsDirectPlay && b.SupportsDirectPlay) return 1
    return 0
  })
  return prioritized[0] ?? null
}
