import { MediaType } from '@server/constants/media';
import Media from '@server/entity/Media';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { Router } from 'express';
import axios from 'axios';

const playRoutes = Router();

const USER_AGENT = 'Seerr/1.0'

interface JellyfinItem {
  Id: string;
  Name: string;
  IndexNumber?: number;
  IndexNumberEnd?: number;
  ParentIndexNumber?: number;
  Type?: string;
  Path?: string;
  Container?: string;
  MediaSources?: Array<{
    Id: string;
    Path: string;
    Container: string;
    MediaStreams: Array<{
      Type: string;
      Codec: string;
      Index: number;
    }>;
  }>;
}

function buildJellyfinHost(settings: ReturnType<typeof getSettings>) {
  const { ip, port, useSsl, urlBase } = settings.jellyfin;
  const protocol = useSsl ? 'https' : 'http';
  return `${protocol}://${ip}:${port}${urlBase || ''}`;
}

function isDirectPlayable(item: JellyfinItem): boolean {
  const source = item.MediaSources?.[0];
  if (!source) return false;

  const container = (source.Container || item.Container || '').toLowerCase();
  const streams = source.MediaStreams || [];

  const videoStream = streams.find((s) => s.Type === 'Video');
  const audioStream = streams.find((s) => s.Type === 'Audio');

  const videoCodec = videoStream?.Codec?.toLowerCase() || '';
  const audioCodec = audioStream?.Codec?.toLowerCase() || '';

  // Direct play requires:
  // - container: mp4 or mkv
  // - video codec: h264
  // - audio codec: aac or mp3
  if (!['mp4', 'mkv', 'm4v'].includes(container)) return false;
  if (videoCodec !== 'h264') return false;
  if (!['aac', 'mp3'].includes(audioCodec)) return false;

  return true;
}

function buildHlsUrl(host: string, apiKey: string, itemId: string, sourceId?: string) {
  return (
    `${host}/Videos/${itemId}/master.m3u8` +
    `?api_key=${apiKey}` +
    `&MediaSourceId=${sourceId ?? itemId}` +
    `&MaxStreamingBitrate=400000000` +
    `&SegmentContainer=ts` +
    `&AudioCodec=aac` +
    `&TranscodingMaxAudioChannels=6` +
    `&StartTimeTicks=0`
  );
}

async function fetchFromJellyfin<T>(host: string, apiKey: string, path: string, params?: Record<string, string | number>): Promise<T | null> {
  try {
    const res = await axios.get<T>(`${host}${path}`, {
      headers: { 'X-Emby-Token': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT },
      params,
      timeout: 15000,
    });
    return res.data;
  } catch (e) {
    logger.warn(`Jellyfin API call failed: ${path}`, {
      label: 'Play Route',
      error: (e as { message?: string }).message,
    });
    return null;
  }
}

async function findEpisodeId(
  host: string,
  apiKey: string,
  seriesId: string,
  seasonNumber: number,
  episodeNumber: number
): Promise<{ episodeId: string; seasonNumber: number; episodeNumber: number } | null> {
  const seasonsData = await fetchFromJellyfin<{ Items: JellyfinItem[] }>(
    host, apiKey, `/Shows/${seriesId}/Seasons`
  );
  const season = seasonsData?.Items?.find((s) => s.IndexNumber === seasonNumber);
  if (!season) {
    logger.warn(`Season ${seasonNumber} not found for series ${seriesId}`, { label: 'Play Route' });
    return null;
  }

  const episodesData = await fetchFromJellyfin<{ Items: JellyfinItem[] }>(
    host, apiKey, `/Shows/${seriesId}/Episodes`, { seasonId: season.Id }
  );
  if (!episodesData?.Items?.length) {
    logger.warn(`No episodes found for season ${seasonNumber} (${season.Id})`, { label: 'Play Route' });
    return null;
  }

  const episode = episodesData.Items.find(
    (e) => e.IndexNumber === episodeNumber || e.IndexNumberEnd === episodeNumber
  );
  if (!episode) return null;
  return { episodeId: episode.Id, seasonNumber, episodeNumber };
}

async function findFirstEpisode(
  host: string,
  apiKey: string,
  seriesId: string
): Promise<{ episodeId: string; seasonNumber: number; episodeNumber: number } | null> {
  const seasonsData = await fetchFromJellyfin<{ Items: JellyfinItem[] }>(
    host, apiKey, `/Shows/${seriesId}/Seasons`
  );
  if (!seasonsData?.Items?.length) return null;

  const sortedSeasons = [...seasonsData.Items]
    .filter((s) => s.IndexNumber !== undefined && s.IndexNumber > 0)
    .sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));

  for (const season of sortedSeasons) {
    const seasonNum = season.IndexNumber!;
    const episodesData = await fetchFromJellyfin<{ Items: JellyfinItem[] }>(
      host, apiKey, `/Shows/${seriesId}/Episodes`, { seasonId: season.Id }
    );
    if (!episodesData?.Items?.length) continue;

    const sortedEps = [...episodesData.Items]
      .filter((e) => e.IndexNumber !== undefined)
      .sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));

    if (sortedEps.length > 0) {
      return {
        episodeId: sortedEps[0].Id,
        seasonNumber: seasonNum,
        episodeNumber: sortedEps[0].IndexNumber!,
      };
    }
  }

  return null;
}

async function findNextEpisode(
  host: string,
  apiKey: string,
  seriesId: string,
  currentSeasonNumber: number,
  currentEpisodeNumber: number
): Promise<{ episodeId: string; seasonNumber: number; episodeNumber: number } | null> {
  const seasonsData = await fetchFromJellyfin<{ Items: JellyfinItem[] }>(
    host, apiKey, `/Shows/${seriesId}/Seasons`
  );
  if (!seasonsData?.Items?.length) return null;

  const currentSeason = seasonsData.Items.find((s) => s.IndexNumber === currentSeasonNumber);
  if (!currentSeason) return null;

  const episodesData = await fetchFromJellyfin<{ Items: JellyfinItem[] }>(
    host, apiKey, `/Shows/${seriesId}/Episodes`, { seasonId: currentSeason.Id }
  );
  if (episodesData?.Items?.length) {
    const sortedEps = [...episodesData.Items]
      .filter((e) => e.IndexNumber !== undefined)
      .sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));

    const currentIndex = sortedEps.findIndex((e) => e.IndexNumber === currentEpisodeNumber);
    if (currentIndex >= 0 && currentIndex < sortedEps.length - 1) {
      const nextEp = sortedEps[currentIndex + 1];
      return { episodeId: nextEp.Id, seasonNumber: currentSeasonNumber, episodeNumber: nextEp.IndexNumber! };
    }
  }

  const nextSeasons = [...seasonsData.Items]
    .filter((s) => s.IndexNumber !== undefined && s.IndexNumber > currentSeasonNumber)
    .sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));

  for (const nextSeason of nextSeasons) {
    const nextEpisodesData = await fetchFromJellyfin<{ Items: JellyfinItem[] }>(
      host, apiKey, `/Shows/${seriesId}/Episodes`, { seasonId: nextSeason.Id }
    );
    if (!nextEpisodesData?.Items?.length) continue;
    const sortedEps = [...nextEpisodesData.Items]
      .filter((e) => e.IndexNumber !== undefined)
      .sort((a, b) => (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0));
    if (sortedEps.length > 0) {
      return { episodeId: sortedEps[0].Id, seasonNumber: nextSeason.IndexNumber!, episodeNumber: sortedEps[0].IndexNumber! };
    }
  }

  return null;
}

playRoutes.get('/:tmdbId/play', async (req, res, next) => {
  const tmdbId = Number(req.params.tmdbId);
  const is4k = req.query.is4k === 'true';
  const mediaType =
    req.query.mediaType === 'tv' ? MediaType.TV : MediaType.MOVIE;
  const isNext = req.query.next === 'true';
  const seasonNumber = req.query.seasonNumber
    ? Number(req.query.seasonNumber)
    : undefined;
  const episodeNumber = req.query.episodeNumber
    ? Number(req.query.episodeNumber)
    : undefined;

  const media = await Media.getMedia(tmdbId, mediaType);

  if (!media) {
    return next({ status: 404, message: 'Media not found in Seerr database. Has it been synced from Jellyfin?' });
  }

  let jellyfinMediaId = is4k ? media.jellyfinMediaId4k : media.jellyfinMediaId;
  let resolvedSeasonNumber: number | undefined = seasonNumber;
  let resolvedEpisodeNumber: number | undefined = episodeNumber;

  if (!jellyfinMediaId) {
    return next({ status: 404, message: 'Jellyfin media ID not found. Try running a Jellyfin library sync in Settings > Jellyfin.' });
  }

  const settings = getSettings();
  const { apiKey } = settings.jellyfin;
  const host = buildJellyfinHost(settings);

  if (mediaType === MediaType.TV) {
    if (isNext && seasonNumber !== undefined && episodeNumber !== undefined) {
      const nextEp = await findNextEpisode(host, apiKey, jellyfinMediaId, seasonNumber, episodeNumber);
      if (!nextEp) {
        return next({ status: 404, message: 'No next episode found' });
      }
      jellyfinMediaId = nextEp.episodeId;
      resolvedSeasonNumber = nextEp.seasonNumber;
      resolvedEpisodeNumber = nextEp.episodeNumber;
    } else if (seasonNumber !== undefined && episodeNumber !== undefined) {
      const episode = await findEpisodeId(host, apiKey, jellyfinMediaId, seasonNumber, episodeNumber);
      if (!episode) {
        return next({
          status: 404,
          message: `Episode S${seasonNumber}E${episodeNumber} not found in Jellyfin`,
        });
      }
      jellyfinMediaId = episode.episodeId;
      resolvedSeasonNumber = episode.seasonNumber;
      resolvedEpisodeNumber = episode.episodeNumber;
    } else {
      const firstEpisode = await findFirstEpisode(host, apiKey, jellyfinMediaId);
      if (!firstEpisode) {
        return next({
          status: 404,
          message: 'No playable episodes found in Jellyfin for this series',
        });
      }
      jellyfinMediaId = firstEpisode.episodeId;
      resolvedSeasonNumber = firstEpisode.seasonNumber;
      resolvedEpisodeNumber = firstEpisode.episodeNumber;
    }
  }

  try {
    // Get a valid Jellyfin user ID for metadata lookups
    const usersResponse = await axios.get<Array<{ Id: string }>>(
      `${host}/Users?api_key=${apiKey}`,
      { timeout: 5000 }
    );
    const userId = usersResponse.data[0]?.Id;
    if (!userId) {
      return next({ status: 500, message: 'No Jellyfin users found' });
    }

    // Fetch full item metadata with MediaStreams for codec detection
    const itemResponse = await axios.get<JellyfinItem>(
      `${host}/Users/${userId}/Items/${jellyfinMediaId}?fields=Path,MediaSources&api_key=${apiKey}`,
      { timeout: 10000 }
    );

    const item = itemResponse.data;
    const source = item.MediaSources?.[0];

    if (isDirectPlayable(item)) {
      return res.status(200).json({
        type: 'direct',
        url: `/api/v1/stream/${jellyfinMediaId}`,
        itemId: jellyfinMediaId,
        seasonNumber: resolvedSeasonNumber,
        episodeNumber: resolvedEpisodeNumber,
      });
    }

    // Not directly playable — use HLS fallback
    const sourceId = source?.Id ?? jellyfinMediaId;
    const hlsUrl = buildHlsUrl(host, apiKey, jellyfinMediaId, sourceId);

    return res.status(200).json({
      type: 'hls',
      url: `/proxy?url=${encodeURIComponent(hlsUrl)}`,
      itemId: jellyfinMediaId,
      seasonNumber: resolvedSeasonNumber,
      episodeNumber: resolvedEpisodeNumber,
    });
  } catch (e) {
    const err = e as { message?: string };
    // Fallback: use HLS if metadata fetch fails
    logger.warn(
      `Failed to fetch item metadata for ${jellyfinMediaId}, using HLS fallback`,
      { label: 'Play Route', error: err.message }
    );

    const hlsUrl = buildHlsUrl(host, apiKey, jellyfinMediaId);

    return res.status(200).json({
      type: 'hls',
      url: `/proxy?url=${encodeURIComponent(hlsUrl)}`,
      itemId: jellyfinMediaId,
      seasonNumber: resolvedSeasonNumber,
      episodeNumber: resolvedEpisodeNumber,
    });
  }
});

export default playRoutes;
