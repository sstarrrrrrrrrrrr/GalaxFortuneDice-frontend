'use client'

import Image from 'next/image'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Dice5, Info, Mail, Settings, Star, Trophy, Users } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  getDailyRanking,
  getRankingMetricValue,
  getRankingNickname,
  getTotalRanking,
  mergeRankingNicknames,
  type RankingItem,
  type RankingMetric,
  type RankingScope,
} from '@/services/ranking'
import { normalizeAvatarSrc } from '@/utils/avatar'
import styles from './page.module.css'

interface RankingTab {
  key: RankingMetric
  label: string
  icon: typeof Trophy
}

const metricHeadMap: Record<RankingMetric, string> = {
  totalGames: '总场数',
  wins: '胜场数',
  highestScore: '最高分',
}

const rankingTabs: RankingTab[] = [
  { key: 'wins', label: metricHeadMap.wins, icon: Trophy },
  { key: 'totalGames', label: metricHeadMap.totalGames, icon: Dice5 },
  { key: 'highestScore', label: metricHeadMap.highestScore, icon: Star },
]

const scopeMap: Record<RankingScope, { label: string; tip: string }> = {
  total: { label: '总排行榜', tip: '排行榜每10分钟更新一次' },
  daily: { label: '日排行榜', tip: '日排行榜按今日数据展示' },
}

const rankMedalImages: Record<number, string> = {
  1: '/images/NO1.png',
  2: '/images/NO2.png',
  3: '/images/NO3.png',
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : '-'
}

function getRankingLevel(item: RankingItem) {
  if (typeof item.level === 'number') return item.level
  if (typeof item.lv === 'number') return item.lv
  if (typeof item.exp === 'number') return Math.floor(item.exp / 200) + 1

  return null
}

function getDisplayName(item: RankingItem) {
  const nickname = getRankingNickname(item)

  if (!nickname) {
    console.warn('[ranking-page] nickname missing', item)
  }

  return nickname || '匿名玩家'
}

function getAvatarStyle(item?: RankingItem): CSSProperties {
  return {
    backgroundImage: `url("${normalizeAvatarSrc(item?.avatar)}")`,
  }
}

function calculateWinRate(item: RankingItem) {
  const wins = getRankingMetricValue(item, 'wins')
  const totalGames = getRankingMetricValue(item, 'totalGames')

  if (!totalGames) return '-'

  return `${((wins / totalGames) * 100).toFixed(1)}%`
}

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

    async function loadRanking() {
      try {
        setIsLoading(true)
        setErrorMessage('')
        console.log('[ranking-page] load start', { scope })

        const nextRankings =
          scope === 'daily'
            ? await getDailyRanking({ limit: 10 })
            : mergeRankingNicknames(await getTotalRanking(10), await getDailyRanking({ limit: 50 }))

        if (!ignore) {
          console.log('[ranking-page] set rankings', {
            scope,
            count: nextRankings.length,
            rankings: nextRankings,
          })
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
          console.log('[ranking-page] load finish', { scope })
          setIsLoading(false)
        }
      }
    }

    loadRanking()

    return () => {
      ignore = true
    }
  }, [scope])

  const sortedRankings = useMemo(
    () =>
      [...rankings].sort(
        (left, right) =>
          getRankingMetricValue(right, metric) - getRankingMetricValue(left, metric) ||
          getRankingMetricValue(right, 'highestScore') - getRankingMetricValue(left, 'highestScore') ||
          left.user_id - right.user_id,
      ),
    [metric, rankings],
  )

  const myRanking = useMemo(() => {
    if (!currentUserId) return null

    const index = sortedRankings.findIndex((item) => item.user_id === currentUserId)
    if (index < 0) return null

    return { item: sortedRankings[index], rank: index + 1 }
  }, [currentUserId, sortedRankings])

  const myItem = myRanking?.item
  const myLevel = myItem ? getRankingLevel(myItem) : null
  const nextGapText = useMemo(() => {
    if (!myRanking) return '-'
    if (myRanking.rank === 1) return '已是第一名'

    const previousItem = sortedRankings[myRanking.rank - 2]
    if (!previousItem) return '-'

    const gap = Math.max(0, getRankingMetricValue(previousItem, metric) - getRankingMetricValue(myRanking.item, metric))
    return `还差${gap}${metricHeadMap[metric]}`
  }, [metric, myRanking, sortedRankings])

  function renderAvatar(item?: RankingItem, className = styles.avatar) {
    return (
      <span className={className}>
        <span className={styles.avatarImage} style={getAvatarStyle(item)} />
      </span>
    )
  }

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.logoBlock}>
          <Image src="/images/logo.png" alt="银河大乐骰 GALAXY DICE" width={316} height={95} priority className={styles.logoImage} />
        </div>

        <h1 className={styles.sideTitle}>排行榜</h1>

        <nav className={styles.menu} aria-label="排行榜菜单">
          <button
            className={`${styles.menuItem} ${scope === 'total' ? styles.menuItemActive : ''}`}
            type="button"
            onClick={() => setScope('total')}
          >
            <Trophy size={28} fill="currentColor" />
            总排行榜
          </button>
          <button
            className={`${styles.menuItem} ${scope === 'daily' ? styles.menuItemActive : ''}`}
            type="button"
            onClick={() => setScope('daily')}
          >
            <CalendarDays size={28} />
            日排行榜
          </button>
        </nav>

        <div className={styles.trophyArt} aria-hidden="true">
          <Image src="/images/class.png" alt="" fill sizes="22vw" className={styles.trophyImage} />
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.actions} aria-label="顶部操作">
            <button className={styles.iconButton} type="button" aria-label="消息">
              <Mail size={28} />
              <span className={styles.badge}>1</span>
            </button>
            <button className={styles.iconButton} type="button" aria-label="好友">
              <Users size={30} />
            </button>
            <button className={styles.iconButton} type="button" aria-label="设置">
              <Settings size={32} fill="currentColor" />
            </button>
          </div>
        </header>

        <div className={styles.panel}>
          <p className={styles.updateTip}>
            {scopeMap[scope].tip}
            <Info size={18} />
          </p>

          <div className={styles.tabs}>
            {rankingTabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                className={`${styles.tab} ${metric === key ? styles.tabActive : ''}`}
                onClick={() => setMetric(key)}
              >
                <Icon size={26} fill="currentColor" />
                {label}
              </button>
            ))}
          </div>

          <div className={styles.tableCard}>
            <div className={`${styles.tableRow} ${styles.tableHead}`}>
              <span>排名</span>
              <span>玩家昵称</span>
              <span className={`${styles.columnHead} ${metric === 'wins' ? styles.sortedHead : ''}`}>
                胜场数
                {metric === 'wins' ? <ChevronDown size={15} /> : null}
              </span>
              <span className={`${styles.columnHead} ${metric === 'totalGames' ? styles.sortedHead : ''}`}>
                总场数
                {metric === 'totalGames' ? <ChevronDown size={15} /> : null}
              </span>
              <span className={`${styles.columnHead} ${metric === 'highestScore' ? styles.sortedHead : ''}`}>
                最高分
                {metric === 'highestScore' ? <ChevronDown size={15} /> : null}
              </span>
            </div>

            <div className={styles.tableBody}>
              {isLoading ? (
                <div className={`${styles.tableRow} ${styles.emptyRow}`}>
                  <span />
                  <span className={styles.playerCell}>
                    <span className={styles.playerName}>正在加载排行榜...</span>
                  </span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              ) : errorMessage ? (
                <div className={`${styles.tableRow} ${styles.emptyRow}`}>
                  <span />
                  <span className={styles.playerCell}>
                    <span className={styles.playerName}>{errorMessage}</span>
                  </span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              ) : sortedRankings.length === 0 ? (
                <div className={`${styles.tableRow} ${styles.emptyRow}`}>
                  <span />
                  <span className={styles.playerCell}>
                    <span className={styles.playerName}>暂无真实排行数据</span>
                  </span>
                  <span>-</span>
                  <span>-</span>
                  <span>-</span>
                </div>
              ) : (
                sortedRankings.map((item, index) => {
                  const rank = index + 1
                  const level = getRankingLevel(item)

                  return (
                    <div className={styles.tableRow} key={`${scope}-${metric}-${item.user_id}`}>
                      <span className={styles.rankCell}>
                        {rank <= 3 ? (
                          <span className={styles.medal}>
                            <Image
                              src={rankMedalImages[rank]}
                              alt={`第${rank}名`}
                              width={44}
                              height={44}
                              className={styles.medalImage}
                            />
                          </span>
                        ) : (
                          <span className={styles.plainRank}>{rank}</span>
                        )}
                      </span>
                      <span className={styles.playerCell}>
                        {renderAvatar(item)}
                        <span className={styles.playerMeta}>
                          <span className={styles.playerName}>{getDisplayName(item)}</span>
                          {level ? <span className={styles.level}>Lv.{level}</span> : null}
                        </span>
                      </span>
                      <span className={styles.goldNumber}>{formatNumber(getRankingMetricValue(item, 'wins'))}</span>
                      <span className={styles.normalNumber}>{formatNumber(getRankingMetricValue(item, 'totalGames'))}</span>
                      <span className={styles.goldNumber}>{formatNumber(getRankingMetricValue(item, 'highestScore'))}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <footer className={styles.myRankCard}>
            <div className={styles.myRankLabel}>
              <span>我的排名</span>
              <strong>{myRanking ? myRanking.rank : '-'}</strong>
            </div>

            <div className={styles.myPlayer}>
              {renderAvatar(myItem, styles.myAvatar)}
              <span className={styles.myPlayerText}>
                <strong>{myItem ? getDisplayName(myItem) : '-'}</strong>
                {myLevel ? <em>Lv.{myLevel}</em> : null}
              </span>
            </div>

            <div className={styles.myStat}>
              <span>胜场数</span>
              <strong>{myItem ? formatNumber(getRankingMetricValue(myItem, 'wins')) : '-'}</strong>
            </div>
            <div className={styles.myStat}>
              <span>总场数</span>
              <strong>{myItem ? formatNumber(getRankingMetricValue(myItem, 'totalGames')) : '-'}</strong>
            </div>
            <div className={styles.myStat}>
              <span>最高分</span>
              <strong>{myItem ? formatNumber(getRankingMetricValue(myItem, 'highestScore')) : '-'}</strong>
            </div>
            <div className={styles.winRate}>
              <span>胜率</span>
              <strong>{myItem ? calculateWinRate(myItem) : '-'}</strong>
            </div>
            <div className={styles.nextGap}>
              <span>距离上一名</span>
              <strong>{nextGapText}</strong>
            </div>
          </footer>
        </div>
      </section>
    </main>
  )
}
