import type { MatchEndedResult, MatchSnapshot } from '@/services/match'
import type { SelectedScore } from './score'

// 构造进入结算页前的兜底结果，接口无数据时用本地累计分补齐。
export function buildFallbackMatchResults({
  fallbackResults,
  matchSnapshot,
  totalScores,
  selectedScores,
}: {
  fallbackResults?: MatchEndedResult[]
  matchSnapshot?: MatchSnapshot | null
  totalScores: Record<number, number>
  selectedScores: Record<number, Record<string, SelectedScore>>
}) {
  if (fallbackResults?.length) return fallbackResults

  return matchSnapshot?.players.map((player) => ({
    user_id: player.user_id,
    nickname: player.nickname,
    total_score:
      totalScores[player.user_id] ??
      Math.max(
        0,
        ...Object.values(selectedScores[player.user_id] ?? {}).map((score) => score.totalScore),
      ),
  })) ?? []
}
