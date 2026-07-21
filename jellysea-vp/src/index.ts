import express from 'express'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { handleConnection } from './handlers/connection'
import { getRoomCount, getConnectionCount } from './store/roomStore'

const PORT = parseInt(process.env.PORT || '8004', 10)
const app = express()
const server = http.createServer(app)

const wss = new WebSocketServer({ server })

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    rooms: getRoomCount(),
    connections: getConnectionCount(),
    uptime: process.uptime(),
  })
})

wss.on('connection', (ws) => {
  handleConnection(ws)
})

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const ext = ws as WebSocket & { isAlive?: boolean }
    if (ext.isAlive === false) {
      ws.terminate()
      return
    }
    ext.isAlive = false
    ws.ping()
  })
}, 30000)

wss.on('close', () => {
  clearInterval(interval)
})

server.listen(PORT, () => {
  console.log(`Jellysea VP signaling server running on port ${PORT}`)
})
