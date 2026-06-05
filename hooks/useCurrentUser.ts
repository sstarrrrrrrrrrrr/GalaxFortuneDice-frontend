'use client'

import { useEffect } from 'react'
import { create } from 'zustand'
import { AUTH_TOKEN_STORAGE_KEY } from '@/services/api'
import { normalizeAvatarSrc } from '@/utils/avatar'

export interface CurrentUser {
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

const CURRENT_USER_STORAGE_KEY = 'galax_user_info'

interface AuthSessionState {
  user: CurrentUser | null
  token: string
  isHydrated: boolean
  hydrateSession: () => void
  setSession: (user: CurrentUser, token: string) => void
  clearSession: () => void
}

// 规整本地用户信息，兼容不同接口字段并补齐头像默认值。
function normalizeCurrentUser(userInfo: Partial<CurrentUser>) {
  if (typeof userInfo.nickname !== 'string') return null

  const readNumber = (...values: Array<number | undefined>) => values.find((value) => typeof value === 'number' && Number.isFinite(value))

  return {
    id: typeof userInfo.id === 'number' ? userInfo.id : 0,
    phone: typeof userInfo.phone === 'string' ? userInfo.phone : null,
    nickname: userInfo.nickname,
    avatar: normalizeAvatarSrc(userInfo.avatar),
    exp: typeof userInfo.exp === 'number' ? userInfo.exp : 0,
    create_time: typeof userInfo.create_time === 'string' ? userInfo.create_time : '',
    highest_score: readNumber(userInfo.highest_score, userInfo.max_score),
    max_score: readNumber(userInfo.max_score, userInfo.highest_score),
    win_count: readNumber(userInfo.win_count, userInfo.wins),
    wins: readNumber(userInfo.wins, userInfo.win_count),
    total_games: readNumber(userInfo.total_games, userInfo.game_count),
    game_count: readNumber(userInfo.game_count, userInfo.total_games),
    win_rate: readNumber(userInfo.win_rate),
  }
}

// 从 localStorage 读取并校验当前用户信息。
function readCurrentUser() {
  if (typeof window === 'undefined') return null

  const storedUserInfo = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY)
  if (!storedUserInfo) return null

  try {
    const parsedUserInfo = JSON.parse(storedUserInfo) as Partial<CurrentUser>
    return normalizeCurrentUser(parsedUserInfo)
  } catch {
    window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    return null
  }
}

// 从 localStorage 读取当前登录 token。
function readAuthToken() {
  if (typeof window === 'undefined') return ''

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

// 保存当前登录会话，并同步写入 localStorage。
export const useAuthSessionStore = create<AuthSessionState>((set, get) => ({
  user: null,
  token: '',
  isHydrated: false,
  hydrateSession: () => {
    if (get().isHydrated) return

    set({
      user: readCurrentUser(),
      token: readAuthToken(),
      isHydrated: true,
    })
  },
  setSession: (user, token) => {
    const normalizedUser = normalizeCurrentUser(user)
    if (!normalizedUser) return

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(normalizedUser))
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    }

    set({ user: normalizedUser, token, isHydrated: true })
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    }

    set({ user: null, token: '', isHydrated: true })
  },
}))

// 读取当前登录用户，供页面和组件派生展示信息。
export function useCurrentUser() {
  const currentUser = useAuthSessionStore((state) => state.user)
  const hydrateSession = useAuthSessionStore((state) => state.hydrateSession)

  useEffect(() => {
    hydrateSession()
  }, [hydrateSession])

  return currentUser
}

export { AUTH_TOKEN_STORAGE_KEY, CURRENT_USER_STORAGE_KEY }
