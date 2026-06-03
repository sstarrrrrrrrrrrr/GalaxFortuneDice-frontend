import { API_BASE_URL, createApiClient } from './api'

const rankingClient = createApiClient({ requireAuth: false })

export type RankingMetric = 'totalGames' | 'wins' | 'highestScore'
export type RankingScope = 'total' | 'daily'

export interface RankingItem {
  user_id: number
  nickname?: string
  nick_name?: string
  username?: string
  name?: string
  avatar: string | null
  score: number
  total_games?: number
  game_count?: number
  win_count?: number
  wins?: number
  highest_score?: number
  max_score?: number
  level?: number
  lv?: number
  exp?: number
  rank?: number
  user?: {
    nickname?: string
    nick_name?: string
    username?: string
    name?: string
  }
}

interface RankingResponse {
  rankings: RankingItem[]
}

interface ApiEnvelope<T> {
  code?: number
  msg?: string
  data?: T
}

type RankingPayload = RankingResponse | ApiEnvelope<RankingResponse>

function unwrapRankings(payload: RankingPayload): RankingItem[] {
  if ('rankings' in payload && Array.isArray(payload.rankings)) {
    return payload.rankings
  }

  if ('data' in payload && payload.data && 'rankings' in payload.data && Array.isArray(payload.data.rankings)) {
    return payload.data.rankings
  }

  return []
}

function logRankingResponse(endpoint: string, payload: RankingPayload, rankings: RankingItem[]) {
  console.log('[ranking] backend response', {
    url: `${API_BASE_URL}${endpoint}`,
    raw: payload,
    rankings,
    count: rankings.length,
  })
}

export function getRankingMetricValue(item: RankingItem, metric: RankingMetric) {
  if (metric === 'totalGames') {
    return item.total_games ?? item.game_count ?? item.score ?? 0
  }

  if (metric === 'wins') {
    return item.win_count ?? item.wins ?? item.score ?? 0
  }

  return item.highest_score ?? item.max_score ?? item.score ?? 0
}

export function getRankingNickname(item: RankingItem) {
  const candidates = [
    item.nickname,
    item.nick_name,
    item.username,
    item.name,
    item.user?.nickname,
    item.user?.nick_name,
    item.user?.username,
    item.user?.name,
  ]

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? ''
}

export function mergeRankingNicknames(items: RankingItem[], nicknameSource: RankingItem[]) {
  const nicknameMap = new Map<number, string>()

  nicknameSource.forEach((item) => {
    const nickname = getRankingNickname(item)
    if (nickname) {
      nicknameMap.set(item.user_id, nickname)
    }
  })

  return items.map((item) => {
    if (getRankingNickname(item)) return item

    const nickname = nicknameMap.get(item.user_id)
    return nickname ? { ...item, nickname } : item
  })
}

export async function getTotalRanking(limit = 10) {
  const endpoint = '/api/ranking/total'
  console.log('[ranking] request start', {
    url: `${API_BASE_URL}${endpoint}`,
    params: { limit },
  })

  const { data } = await rankingClient.get<RankingPayload>('/api/ranking/total', {
    params: { limit },
  })

  const rankings = unwrapRankings(data)
  logRankingResponse(endpoint, data, rankings)

  return rankings
}

export async function getDailyRanking({ date, limit = 10 }: { date?: string; limit?: number } = {}) {
  const endpoint = '/api/ranking/daily'
  console.log('[ranking] request start', {
    url: `${API_BASE_URL}${endpoint}`,
    params: { date, limit },
  })

  const { data } = await rankingClient.get<RankingPayload>(endpoint, {
    params: { date, limit },
  })

  const rankings = unwrapRankings(data)
  logRankingResponse(endpoint, data, rankings)

  return rankings
}
