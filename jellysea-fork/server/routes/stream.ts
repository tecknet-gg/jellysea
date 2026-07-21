import { Router } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import logger from '@server/logger';
import { getSettings } from '@server/lib/settings';

const streamRoutes = Router();

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  ts: 'video/mp2t',
  m4v: 'video/mp4',
  ogv: 'video/ogg',
  wmv: 'video/x-ms-wmv',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  flv: 'video/x-flv',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  ac3: 'audio/ac3',
  eac3: 'audio/eac3',
  m4a: 'audio/mp4',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function buildJellyfinHost(settings: ReturnType<typeof getSettings>) {
  const { ip, port, useSsl, urlBase } = settings.jellyfin;
  const protocol = useSsl ? 'https' : 'http';
  return `${protocol}://${ip}:${port}${urlBase || ''}`;
}

streamRoutes.get('/:itemId', async (req, res, next) => {
  const { itemId } = req.params;

  if (!itemId) {
    return res.status(400).json({ message: 'Missing itemId parameter' });
  }

  try {
    const settings = getSettings();
    const { apiKey } = settings.jellyfin;
    const host = buildJellyfinHost(settings);

    const usersResponse = await axios.get<Array<{ Id: string }>>(
      `${host}/Users?api_key=${apiKey}`,
      { timeout: 5000 }
    );
    const userId = usersResponse.data[0]?.Id;
    if (!userId) {
      return next({ status: 500, message: 'No Jellyfin users found' });
    }

    const apiUrl = `${host}/Users/${userId}/Items/${itemId}?fields=Path,MediaSources&api_key=${apiKey}`;
    const itemResponse = await axios.get(apiUrl, { timeout: 10000 });

    const item = itemResponse.data;
    const mediaSource = item.MediaSources?.[0];
    const filePath = mediaSource?.Path || item.Path;

    if (!filePath) {
      return next({ status: 404, message: 'File path not found for this item' });
    }

    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found on disk: ${filePath}`, { label: 'Stream' });
      return next({ status: 404, message: 'File not found on disk' });
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const mimeType = getMimeType(filePath);

    const rangeHeader = req.headers.range;

    if (rangeHeader && typeof rangeHeader === 'string') {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      if (start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const stream = fs.createReadStream(filePath, { start, end, highWaterMark: 262144 });

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');

      stream.pipe(res);

      stream.on('error', (err) => {
        logger.error('Stream error', { label: 'Stream', errorMessage: err.message });
        if (!res.headersSent) {
          res.status(500).json({ message: 'Stream error' });
        }
      });
    } else {
      res.status(200);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache');

      const stream = fs.createReadStream(filePath, { highWaterMark: 262144 });
      stream.pipe(res);

      stream.on('error', (err) => {
        logger.error('Stream error', { label: 'Stream', errorMessage: err.message });
        if (!res.headersSent) {
          res.status(500).json({ message: 'Stream error' });
        }
      });
    }
  } catch (e) {
    const err = e as { message?: string; response?: { status?: number } };
    logger.error('Stream route error', { label: 'Stream', errorMessage: err.message });
    if (!res.headersSent) {
      res.status(err.response?.status || 500).json({ message: 'Failed to stream file' });
    }
  }
});

export default streamRoutes;
