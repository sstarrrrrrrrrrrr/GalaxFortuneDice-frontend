import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from '@/services/api'

const activeSockets = new Set<WebSocket>()

export function registerActiveSocket(socket: WebSocket) {
  activeSockets.add(socket)

  const unregister = () => activeSockets.delete(socket)
  socket.addEventListener('close', unregister, { once: true })

  return unregister
}

export function closeAllWebSockets() {
  for (const socket of activeSockets) {
    if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
      socket.close()
    }
  }

  activeSockets.clear()
}

// 从 localStorage 读取 WebSocket 鉴权 token。
export function readStoredAuthToken() {
  if (typeof window === 'undefined') return ''

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

// 根据 API_BASE_URL 构造 ws/wss 地址，并把 token 放到查询参数中。
export function buildSocketUrl(pathname: string, authToken?: string) {
  const apiUrl = new URL(API_BASE_URL)
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  apiUrl.pathname = pathname
  apiUrl.search = ''

  const token = authToken || readStoredAuthToken()
  if (token) {
    apiUrl.searchParams.set('token', token)
  }

  return apiUrl.toString()
}

// 打印 WebSocket 地址前隐藏 token，避免开发日志泄露鉴权信息。
export function redactSocketUrl(socketUrl: string) {
  try {
    const url = new URL(socketUrl)
    if (url.searchParams.has('token')) {
      url.searchParams.set('token', '[redacted]')
    }

    return url.toString()
  } catch {
    return socketUrl
  }
}

// 将浏览器 WebSocket 收到的 string/Blob 统一转换成字符串。
export async function readSocketMessageData(data: unknown) {
  if (typeof data === 'string') return data
  if (data instanceof Blob) return data.text()

  return ''
}

// 仅在开发环境输出 WebSocket 调试日志。
export function logSocketDebug(label: string, value: unknown) {
  if (process.env.NODE_ENV !== 'development') return

  console.log(label, value)
}

// 仅在开发环境输出 WebSocket 警告日志。
export function warnSocketDebug(label: string, value: unknown) {
  if (process.env.NODE_ENV !== 'development') return

  console.warn(label, value)
}
