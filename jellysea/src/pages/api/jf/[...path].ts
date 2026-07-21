import type { NextApiRequest, NextApiResponse } from 'next'

const JELLYFIN_URL = process.env.NEXT_PUBLIC_JELLYFIN_URL || 'http://localhost:8096'

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
    responseLimit: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || ''
  const queryString = req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''
  const targetUrl = `${JELLYFIN_URL.replace(/\/+$/, '')}/${path}${queryString}`

  if (req.method === 'OPTIONS') {
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', '*')
    res.setHeader('access-control-allow-methods', 'GET, POST, HEAD, OPTIONS')
    return res.status(204).end()
  }

  const headers: Record<string, string> = {
    'X-Emby-Client': 'Jellysea',
    'X-Emby-Client-Version': '0.1.3',
  }

  const authHeader = req.headers['authorization']
  if (authHeader && typeof authHeader === 'string') {
    headers['Authorization'] = authHeader
  }
  const embyToken = req.headers['x-emby-token'] || req.headers['x-mediabrowser-token']
  if (embyToken && typeof embyToken === 'string') {
    headers['X-Emby-Token'] = embyToken
  }
  const embyAuth = req.headers['x-emby-authorization']
  if (embyAuth && typeof embyAuth === 'string') {
    headers['X-Emby-Authorization'] = embyAuth
  }

  const contentType = req.headers['content-type']
  const rangeHeader = req.headers['range']

  let body: Buffer | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  try {
    const fetchInit: RequestInit = {
      method: req.method,
      headers: {
        ...headers,
        ...(rangeHeader && typeof rangeHeader === 'string' ? { Range: rangeHeader } : {}),
        ...(contentType && typeof contentType === 'string' ? { 'Content-Type': contentType } : {}),
      },
      ...(body ? { body: body as BodyInit } : {}),
    }

    const response = await fetch(targetUrl, fetchInit)

    const responseContentType = response.headers.get('content-type') || ''
    const isM3u8 = responseContentType.includes('m3u8') || responseContentType.includes('mpegurl') || path.includes('.m3u8')
    const isMedia = responseContentType.startsWith('video/') || responseContentType.startsWith('audio/') || responseContentType.includes('octet-stream')

    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', '*')
    res.setHeader('access-control-allow-methods', 'GET, POST, HEAD, OPTIONS')

    if (isM3u8) {
      res.setHeader('content-type', 'application/x-mpegURL')
      const text = await response.text()
      const baseUrl = new URL(targetUrl)
      const baseOriginPath = baseUrl.protocol + '//' + baseUrl.host + baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1)

      const proxyUrl = (inputUrl: string): string => {
        const trimmed = inputUrl.trim()
        if (!trimmed) return inputUrl
        if (trimmed.startsWith('/')) return `/api/jf${trimmed}`
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const parsed = new URL(trimmed)
          return `/api/jf${parsed.pathname}${parsed.search}`
        }
        const resolved = new URL(trimmed, baseOriginPath)
        return `/api/jf${resolved.pathname}${resolved.search}`
      }

      const lines = text.split('\n')
      const rewritten = lines.map((line) => {
        const trimmed = line.trim()
        if (trimmed === '' || trimmed.startsWith('#')) {
          return line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${proxyUrl(uri)}"`)
        }
        return proxyUrl(trimmed)
      })

      return res.status(response.status).send(rewritten.join('\n'))
    }

    if (isMedia) {
      const contentLength = response.headers.get('content-length')
      const contentRange = response.headers.get('content-range')

      if (contentLength) res.setHeader('content-length', contentLength)
      if (contentRange) res.setHeader('content-range', contentRange)
      res.setHeader('content-type', responseContentType)
      res.setHeader('accept-ranges', 'bytes')

      const arrayBuffer = await response.arrayBuffer()
      return res.status(response.status).send(Buffer.from(arrayBuffer))
    }

    const data = await response.text()
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'access-control-allow-origin'].includes(lower)) {
        res.setHeader(key, value)
      }
    })

    return res.status(response.status).send(data)
  } catch (e) {
    return res.status(502).json({ error: 'Proxy failed', message: (e as Error).message })
  }
}
