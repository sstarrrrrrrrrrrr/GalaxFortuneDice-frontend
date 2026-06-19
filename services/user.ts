import { createApiClient } from './api'

const userClient = createApiClient({ requireAuth: false })

export interface UserInfo {
  id: number
  phone: string | null
  nickname: string
  avatar: string
  exp: number
  create_time: string
  total_games: number
  total_wins: number
  max_score: number
}

interface UserInfoResponse {
  code: number
  msg: string
  data: UserInfo
}

export async function getUserInfo(token: string) {
  const { data } = await userClient.get<UserInfoResponse>('/api/user/info', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!data.data) {
    throw new Error(data.msg || '获取用户信息失败')
  }

  return data.data
}
