import { createApiClient } from './api'

const authClient = createApiClient({ requireAuth: false })

export interface RegisterRequest {
  phone: string
  nickname: string
  password: string
}

export interface LoginRequest {
  phone: string
  password: string
}

export interface AuthUserInfo {
  id: number
  phone: string | null
  nickname: string
  avatar: string
  exp: number
  create_time: string
  highest_score?: number
  max_score?: number
  win_count?: number
  wins?: number
  total_games?: number
  game_count?: number
  win_rate?: number
}

export interface AuthResponse {
  code: number
  msg: string
  data: {
    user_info: AuthUserInfo
    token: string
  }
}

function ensureAuthSuccess(response: AuthResponse) {
  if (response.data?.token && response.data.user_info) {
    return response
  }

  if (response.code !== 0) {
    throw new Error(response.msg || '请求失败')
  }

  return response
}

export async function registerUser(payload: RegisterRequest) {
  const { data } = await authClient.post<AuthResponse>('/api/user/register', payload)
  return ensureAuthSuccess(data)
}

export async function loginUser(payload: LoginRequest) {
  const { data } = await authClient.post<AuthResponse>('/api/user/login', payload)
  return ensureAuthSuccess(data)
}

export async function loginGuest() {
  const { data } = await authClient.post<AuthResponse>('/api/user/guest')
  return ensureAuthSuccess(data)
}
