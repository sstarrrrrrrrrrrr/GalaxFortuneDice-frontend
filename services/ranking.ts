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

// 解包排行榜响应，兼容直接 rankings 和 data.rankings 两种结构。
function unwrapRankings(payload: RankingPayload): RankingItem[] {
  if ('rankings' in payload && Array.isArray(payload.rankings)) {
    return payload.rankings
  }

  if ('data' in payload && payload.data && 'rankings' in payload.data && Array.isArray(payload.data.rankings)) {
    return payload.data.rankings
  }

  return []
}

// 开发环境打印排行榜响应，便于对照后端字段。
function logRankingResponse(endpoint: string, payload: RankingPayload, rankings: RankingItem[]) {
  if (process.env.NODE_ENV !== 'development') return

  console.log('[ranking] backend response', {
    url: `${API_BASE_URL}${endpoint}`,
    raw: payload,
    rankings,
    count: rankings.length,
  })
}

// 开发环境打印排行榜请求参数。
function logRankingRequest(endpoint: string, params: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development') return

  console.log('[ranking] request start', {
    url: `${API_BASE_URL}${endpoint}`,
    params,
  })
}

// 根据当前排序指标读取对应数值，兼容后端不同字段命名。
export function getRankingMetricValue(item: RankingItem, metric: RankingMetric) {
  if (metric === 'totalGames') {
    return item.total_games ?? item.game_count ?? item.score ?? 0
  }

  if (metric === 'wins') {
    return item.win_count ?? item.wins ?? item.score ?? 0
  }

  return item.highest_score ?? item.max_score ?? item.score ?? 0
}

// 从多种可能的昵称字段中读取最终展示昵称。
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

// 用另一个榜单的昵称数据补齐当前榜单缺失的昵称。
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

// 获取总排行榜数据。
export async function getTotalRanking(limit = 10) {
  const endpoint = '/api/ranking/total'
  logRankingRequest(endpoint, { limit })

  const { data } = await rankingClient.get<RankingPayload>('/api/ranking/total', {
    params: { limit },
  })

  const rankings = unwrapRankings(data)
  logRankingResponse(endpoint, data, rankings)

  return rankings
}

// 获取日排行榜数据，可按日期和数量过滤。
export async function getDailyRanking({ date, limit = 10 }: { date?: string; limit?: number } = {}) {
  const endpoint = '/api/ranking/daily'
  logRankingRequest(endpoint, { date, limit })

  const { data } = await rankingClient.get<RankingPayload>(endpoint, {
    params: { date, limit },
  })

  const rankings = unwrapRankings(data)
  logRankingResponse(endpoint, data, rankings)

  return rankings
}
