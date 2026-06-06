import { buildSocketUrl, logSocketDebug, readSocketMessageData, redactSocketUrl, registerActiveSocket, warnSocketDebug } from './shared'

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

// 构造对局 WebSocket 地址。
function buildMatchSocketUrl(matchId: string, authToken?: string) {
  return buildSocketUrl(`/ws/match/${encodeURIComponent(matchId)}`, authToken)
}

// 将未知值收窄为普通对象，便于安全读取字段。
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

// 从多个候选字段中读取第一个非空字符串。
function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return undefined
}

// 解析对局 WebSocket 原始消息，提取事件类型和消息对象。
function parseMatchMessage(rawMessage: string): MatchChannelEvent {
  const parsed = JSON.parse(rawMessage) as unknown
  const message = asRecord(parsed)

  if (!message) return {}

  return {
    rawType: readString(message, ['type', 'event', 'action']),
    message,
  }
}

// 建立对局 WebSocket 连接，并返回清理函数供页面卸载时关闭连接。
export function connectMatchChannel({
  matchId,
  authToken,
  onMessage,
  onOpen,
  onError,
  onClose,
}: ConnectMatchChannelOptions) {
  const socket = new WebSocket(buildMatchSocketUrl(matchId, authToken))
  const unregisterSocket = registerActiveSocket(socket)
  let disposed = false

  socket.addEventListener('open', () => {
    if (disposed) {
      socket.close()
      return
    }

    logSocketDebug('[match websocket open]', redactSocketUrl(socket.url))
    onOpen?.()
  })
  socket.addEventListener('error', () => {
    warnSocketDebug('[match websocket error]', redactSocketUrl(socket.url))
    if (!disposed) onError?.()
  })
  socket.addEventListener('close', () => {
    logSocketDebug('[match websocket close]', redactSocketUrl(socket.url))
    if (!disposed) onClose?.()
  })
  socket.addEventListener('message', async (event) => {
    if (disposed) return

    const rawMessage = await readSocketMessageData(event.data)
    if (disposed || !rawMessage) return

    try {
      logSocketDebug('[match websocket message]', rawMessage)
      onMessage(parseMatchMessage(rawMessage))
    } catch {
      onError?.()
    }
  })

  return () => {
    disposed = true
    unregisterSocket()

    if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
      socket.close()
    }
  }
}
