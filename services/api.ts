import axios from 'axios'

export const API_BASE_URL = 'http://192.168.21.26:8001'
export const AUTH_TOKEN_STORAGE_KEY = 'galax_auth_token'

interface ApiClientOptions {
  requireAuth?: boolean
}

function readErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const message = record.msg ?? record.message ?? record.detail

  if (typeof message === 'string' && message.trim()) {
    return message
  }

  if (Array.isArray(message) && message.length > 0) {
    return '请求参数错误'
  }

  return null
}

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return readErrorMessage(error.response?.data) ?? (error.response?.status ? `请求失败：${error.response.status}` : error.message)
  }

  return error instanceof Error ? error.message : '请求失败'
}

function getStoredToken() {
  if (typeof window === 'undefined') return ''

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

export function createApiClient({ requireAuth = true }: ApiClientOptions = {}) {
  const client = axios.create({
    baseURL: API_BASE_URL,
  })

  client.interceptors.request.use((config) => {
    const token = getStoredToken()

    if (!token) {
      if (requireAuth) {
        return Promise.reject(new Error('Missing auth token'))
      }

      return config
    }

    config.headers.Authorization = `Bearer ${token}`
    return config
  })
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(new Error(getApiErrorMessage(error))),
  )

  return client
}
