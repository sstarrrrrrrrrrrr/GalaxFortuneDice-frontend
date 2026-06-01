import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from '@/services/api'

export interface MatchChannelEvent {
  rawType?: string
  message?: Record<string, unknown>
}

interface ConnectMatchChannelOptions {
  matchId: string
  authToken?: string
  onMessage: (event: MatchChannelEvent) => void
  onOpen?: () => void
  onError?: () => void
  onClose?: () => void
}

function getAuthToken() {
  if (typeof window === 'undefined') return ''

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

function buildMatchSocketUrl(matchId: string, authToken?: string) {
  const apiUrl = new URL(API_BASE_URL)
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  apiUrl.pathname = `/ws/match/${encodeURIComponent(matchId)}`
  apiUrl.search = ''

  const token = authToken || getAuthToken()
  if (token) {
    apiUrl.searchParams.set('token', token)
  }

  return apiUrl.toString()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return undefined
}

function parseMatchMessage(rawMessage: string): MatchChannelEvent {
  const parsed = JSON.parse(rawMessage) as unknown
  const message = asRecord(parsed)

  if (!message) return {}

  return {
    rawType: readString(message, ['type', 'event', 'action']),
    message,
  }
}

export function connectMatchChannel({
  matchId,
  authToken,
  onMessage,
  onOpen,
  onError,
  onClose,
}: ConnectMatchChannelOptions) {
  const socket = new WebSocket(buildMatchSocketUrl(matchId, authToken))
  let disposed = false

  socket.addEventListener('open', () => {
    if (disposed) {
      socket.close()
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[match websocket open]', socket.url)
    }
    onOpen?.()
  })
  socket.addEventListener('error', () => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[match websocket error]', socket.url)
    }
    if (!disposed) onError?.()
  })
  socket.addEventListener('close', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[match websocket close]', socket.url)
    }
    if (!disposed) onClose?.()
  })
  socket.addEventListener('message', async (event) => {
    if (disposed) return

    const rawMessage = typeof event.data === 'string' ? event.data : event.data instanceof Blob ? await event.data.text() : ''
    if (disposed || !rawMessage) return

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[match websocket message]', rawMessage)
      }
      onMessage(parseMatchMessage(rawMessage))
    } catch {
      onError?.()
    }
  })

  return () => {
    disposed = true

    if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
      socket.close()
    }
  }
}
