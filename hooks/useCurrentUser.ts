'use client'

import { create } from 'zustand'
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
const AUTH_TOKEN_STORAGE_KEY = 'galax_auth_token'

interface AuthSessionState {
  user: CurrentUser | null
  token: string
  setSession: (user: CurrentUser, token: string) => void
  clearSession: () => void
}

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

function readAuthToken() {
  if (typeof window === 'undefined') return ''

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  user: readCurrentUser(),
  token: readAuthToken(),
  setSession: (user, token) => {
    const normalizedUser = normalizeCurrentUser(user)
    if (!normalizedUser) return

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(normalizedUser))
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
    }

    set({ user: normalizedUser, token })
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    }

    set({ user: null, token: '' })
  },
}))

export function useCurrentUser() {
  return useAuthSessionStore((state) => state.user)
}

export { AUTH_TOKEN_STORAGE_KEY, CURRENT_USER_STORAGE_KEY }
