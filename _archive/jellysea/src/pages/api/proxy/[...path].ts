import type { NextApiRequest, NextApiResponse } from 'next'
import httpProxy from 'http-proxy'

const SEERR_URL = process.env.SEERR_URL || 'http://seerr:5055'

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}

const proxy = httpProxy.createProxyServer({
  target: SEERR_URL,
  changeOrigin: true,
  proxyTimeout: 30000,
})

proxy.on('proxyRes', (proxyRes, req) => {
  const setCookie = proxyRes.headers['set-cookie']
  if (setCookie) {
    const host = req.headers.host?.split(':')[0] || 'localhost'
    const rewritten = (Array.isArray(setCookie) ? setCookie : [setCookie]).map(
      (c) => c.replace(/Domain\s*=\s*[^;]+/gi, `Domain=${host}`)
    )
    proxyRes.headers['set-cookie'] = rewritten
  }
})

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path || ''
  req.url = `/api/v1/${path}${req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`

  return new Promise<void>((resolve, reject) => {
    proxy.web(req, res, {}, (err) => {
      if (err) {
        reject(err)
      }
      resolve()
    })
  })
}