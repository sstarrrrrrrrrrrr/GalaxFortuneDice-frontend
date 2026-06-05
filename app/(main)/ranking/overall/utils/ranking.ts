import { getRankingMetricValue, type RankingItem, type RankingMetric } from '@/services/ranking'

// 按当前指标排序榜单，并用最高分和 user_id 做稳定兜底排序。
export function sortRankingsByMetric(rankings: RankingItem[], metric: RankingMetric) {
  return [...rankings].sort(
    (left, right) =>
      getRankingMetricValue(right, metric) - getRankingMetricValue(left, metric) ||
      getRankingMetricValue(right, 'highestScore') - getRankingMetricValue(left, 'highestScore') ||
      left.user_id - right.user_id,
  )
}

// 在已排序榜单中查找当前用户排名。
export function findMyRanking(sortedRankings: RankingItem[], currentUserId?: number) {
  if (!currentUserId) return null

  const index = sortedRankings.findIndex((item) => item.user_id === currentUserId)
  if (index < 0) return null

  return { item: sortedRankings[index], rank: index + 1 }
}
