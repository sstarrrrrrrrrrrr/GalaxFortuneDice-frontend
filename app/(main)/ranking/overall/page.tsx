'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  getDailyRanking,
  getRankingMetricValue,
  getTotalRanking,
  mergeRankingNicknames,
  type RankingItem,
  type RankingMetric,
  type RankingScope,
} from '@/services/ranking'
import { RankingView, metricHeadMap } from './components/RankingView'
import { findMyRanking, sortRankingsByMetric } from './utils/ranking'

// 排行榜页容器，加载总榜/日榜数据并计算当前用户排名与追赶差距。
export default function OverallRankingPage() {
  const currentUser = useCurrentUser()
  const currentUserId = currentUser?.id
  const [scope, setScope] = useState<RankingScope>('total')
  const [metric, setMetric] = useState<RankingMetric>('totalGames')
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let ignore = false

    // 按当前榜单范围加载排行榜，总榜额外合并日榜昵称作为兼容兜底。
    async function loadRanking() {
      try {
        setIsLoading(true)
        setErrorMessage('')
        if (process.env.NODE_ENV === 'development') {
          console.log('[ranking-page] load start', { scope })
        }

        const nextRankings =
          scope === 'daily'
            ? await getDailyRanking({ limit: 10 })
            : mergeRankingNicknames(await getTotalRanking(10), await getDailyRanking({ limit: 50 }))

        if (!ignore) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ranking-page] set rankings', {
              scope,
              count: nextRankings.length,
              rankings: nextRankings,
            })
          }
          setRankings(nextRankings)
        }
      } catch (error) {
        if (!ignore) {
          console.error('[ranking-page] load failed', error)
          setRankings([])
          setErrorMessage(error instanceof Error ? error.message : '排行榜加载失败')
        }
      } finally {
        if (!ignore) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ranking-page] load finish', { scope })
          }
          setIsLoading(false)
        }
      }
    }

    loadRanking()

    return () => {
      ignore = true
    }
  }, [scope])

  const sortedRankings = useMemo(() => sortRankingsByMetric(rankings, metric), [metric, rankings])

  const myRanking = useMemo(() => findMyRanking(sortedRankings, currentUserId), [currentUserId, sortedRankings])

  const nextGapText = useMemo(() => {
    if (!myRanking) return '-'
    if (myRanking.rank === 1) return '已是第一名'

    const previousItem = sortedRankings[myRanking.rank - 2]
    if (!previousItem) return '-'

    const gap = Math.max(0, getRankingMetricValue(previousItem, metric) - getRankingMetricValue(myRanking.item, metric))
    return `还差${gap}${metricHeadMap[metric]}`
  }, [metric, myRanking, sortedRankings])

  return (
    <RankingView
      scope={scope}
      metric={metric}
      rankings={sortedRankings}
      isLoading={isLoading}
      errorMessage={errorMessage}
      myRanking={myRanking}
      nextGapText={nextGapText}
      onScopeChange={setScope}
      onMetricChange={setMetric}
    />
  )
}
