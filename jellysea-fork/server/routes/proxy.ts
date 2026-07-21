import { Router } from 'express';
import axios from 'axios';
import logger from '@server/logger';

const proxyRoutes = Router();

proxyRoutes.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ message: 'Missing url parameter' });
  }

  req.on('error', (err: Error) => {
    logger.warn('Proxy request stream error', {
      label: 'Proxy',
      errorMessage: err.message,
    });
  });

  try {
    const axiosConfig: Record<string, unknown> = {
      responseType: 'stream',
      timeout: 120000,
      maxRedirects: 5,
      decompress: false,
    };

    const forwardHeaders: Record<string, string> = {};
    const rangeHeader = req.headers.range;
    if (rangeHeader && typeof rangeHeader === 'string') {
      forwardHeaders['Range'] = rangeHeader;
    }
    const uaHeader = req.headers['user-agent'];
    if (uaHeader && typeof uaHeader === 'string') {
      forwardHeaders['User-Agent'] = uaHeader;
    }

    if (Object.keys(forwardHeaders).length > 0) {
      axiosConfig.headers = forwardHeaders;
    }

    const response = await axios.get(url, axiosConfig);

    const contentType = (response.headers['content-type'] ?? '').toLowerCase();
    const contentLength = response.headers['content-length'];

    res.setHeader('access-control-allow-origin', '*');

    if (contentLength) {
      res.setHeader('content-length', contentLength);
    }

    const isM3u8 =
      contentType.includes('m3u8') ||
      contentType.includes('mpegurl') ||
      /\.m3u8(\?|$)/i.test(url);

    if (isM3u8) {
      res.setHeader('content-type', 'application/x-mpegURL');

      const chunks: Buffer[] = [];
      response.data.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      response.data.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8');
        const baseUrl = new URL(url);
        const baseOriginPath = baseUrl.origin + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);

        const proxyUrl = (inputUrl: string): string => {
          const trimmed = inputUrl.trim();
          if (!trimmed) return inputUrl;
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return `/proxy?url=${encodeURIComponent(trimmed)}`;
          }
          const absolute = new URL(trimmed, baseOriginPath).toString();
          return `/proxy?url=${encodeURIComponent(absolute)}`;
        };

        const lines = data.split('\n');
        const rewritten = lines.map((line) => {
          const trimmed = line.trim();
          if (trimmed === '' || trimmed.startsWith('#')) {
            return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
              return `URI="${proxyUrl(uri)}"`;
            });
          }
          return proxyUrl(trimmed);
        });
        res.send(rewritten.join('\n'));
      });
      response.data.on('error', (err: Error) => {
        logger.error('Proxy stream error while reading M3U8', {
          label: 'Proxy',
          errorMessage: err.message,
        });
        if (!res.headersSent) {
          res.status(502).json({ message: 'Failed to read upstream stream' });
        }
      });
    } else {
      if (response.status === 206) {
        res.status(206);
        const contentRange = response.headers['content-range'];
        if (contentRange) {
          res.setHeader('content-range', contentRange);
        }
      }
      res.setHeader('content-type', contentType);
      res.setHeader('accept-ranges', 'bytes');
      response.data.pipe(res);
      response.data.on('error', (err: Error) => {
        logger.error('Proxy stream error while piping segment', {
          label: 'Proxy',
          errorMessage: err.message,
        });
        if (!res.headersSent) {
          res.status(502).json({ message: 'Upstream stream error' });
        }
      });
    }
  } catch (e) {
    const axiosErr = e as { response?: { status: number }; message: string };
    logger.warn('Proxy request failed', {
      label: 'Proxy',
      url: url.substring(0, 100),
      error: axiosErr.response?.status ?? axiosErr.message,
    });
    if (!res.headersSent) {
      res.status(502).json({ message: 'Failed to proxy request' });
    }
  }
});

export default proxyRoutes;
