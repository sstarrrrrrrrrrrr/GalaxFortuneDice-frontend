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

export interface AuthResponse {
  code: number
  msg: string
  data: {
    token: string
  }
}

// 校验认证接口是否返回 token，完整用户信息由用户信息接口单独获取。
function ensureAuthSuccess(response: AuthResponse) {
  if (response.data?.token) {
    return response
  }

  if (response.code !== 0) {
    throw new Error(response.msg || '请求失败')
  }

  return response
}

// 调用注册接口创建正式账号。
export async function registerUser(payload: RegisterRequest) {
  const { data } = await authClient.post<AuthResponse>('/api/user/register', payload)
  return ensureAuthSuccess(data)
}

// 调用账号密码登录接口。
export async function loginUser(payload: LoginRequest) {
  const { data } = await authClient.post<AuthResponse>('/api/user/login', payload)
  return ensureAuthSuccess(data)
}

// 调用游客登录接口，获取游客身份 token。
export async function loginGuest() {
  const { data } = await authClient.post<AuthResponse>('/api/user/guest')
  return ensureAuthSuccess(data)
}
