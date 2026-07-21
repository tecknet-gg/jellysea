import { useRef, useState, useCallback, useEffect } from 'react'
import type { SignalMessage, SignalType, PeerInfo, ConnectionState } from '@/utils/watchPartyTypes'

const RECONNECT_DELAY = 2000
const MAX_RECONNECT_ATTEMPTS = 5

export function useSignaling(url: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handlersRef = useRef<Map<string, Set<(msg: SignalMessage) => void>>>(new Map())
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [peerId, setPeerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setConnectionState('connecting')
    setError(null)

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionState('connected')
      reconnectAttempts.current = 0
    }

    ws.onmessage = (event) => {
      let msg: SignalMessage
      try {
        msg = JSON.parse(event.data)
      } catch {
        return
      }

      if (msg.type === 'peer-id') {
        const pid = (msg.payload as { peerId: string }).peerId
        setPeerId(pid)
      }

      const listeners = handlersRef.current.get(msg.type)
      if (listeners) {
        for (const handler of listeners) {
          handler(msg)
        }
      }

      const wildcard = handlersRef.current.get('*')
      if (wildcard) {
        for (const handler of wildcard) {
          handler(msg)
        }
      }
    }

    ws.onclose = () => {
      setConnectionState('disconnected')
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY * reconnectAttempts.current)
      } else {
        setError('Unable to connect to signaling server after multiple attempts')
      }
    }

    ws.onerror = () => {
      setConnectionState('disconnected')
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS
    wsRef.current?.close()
    wsRef.current = null
    setConnectionState('disconnected')
    setPeerId(null)
  }, [])

  const send = useCallback((msg: SignalMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const on = useCallback((type: SignalType | '*', handler: (msg: SignalMessage) => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set())
    }
    handlersRef.current.get(type)!.add(handler)

    return () => {
      handlersRef.current.get(type)?.delete(handler)
    }
  }, [])

  const sendToRoom = useCallback((roomId: string, type: SignalType, payload: unknown, targetId?: string) => {
    send({
      type,
      roomId,
      payload,
      senderId: peerId || '',
      targetId,
    })
  }, [send, peerId])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connect,
    disconnect,
    send,
    sendToRoom,
    on,
    peerId,
    connectionState,
    error,
    ws: wsRef,
  }
}
