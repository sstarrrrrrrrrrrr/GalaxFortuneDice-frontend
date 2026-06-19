import Image from 'next/image'
import { type CSSProperties } from 'react'
import { CalendarDays, Dice5, Info, Mail, Settings, Star, Trophy, Users } from 'lucide-react'
import { PageExitButton } from '@/components/PageExitButton'
import {
  getRankingMetricValue,
  getRankingNickname,
  type RankingItem,
  type RankingMetric,
  type RankingScope,
} from '@/services/ranking'
import { normalizeAvatarSrc } from '@/utils/avatar'
import styles from '../page.module.css'

interface RankingTab {
  key: RankingMetric
  label: string
  icon: typeof Trophy
}

interface MyRanking {
  item: RankingItem
  rank: number
}

interface RankingViewProps {
  scope: RankingScope
  metric: RankingMetric
  rankings: RankingItem[]
  isLoading: boolean
  errorMessage: string
  myRanking: MyRanking | null
  nextGapText: string
  onScopeChange: (scope: RankingScope) => void
  onMetricChange: (metric: RankingMetric) => void
}

export const metricHeadMap: Record<RankingMetric, string> = {
  totalGames: '总场数',
  wins: '胜场数',
  highestScore: '最高分',
}

const rankingTabs: RankingTab[] = [
  { key: 'wins', label: '胜场', icon: Trophy },
  { key: 'totalGames', label: '总场', icon: Dice5 },
  { key: 'highestScore', label: '最高分', icon: Star },
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

const topThreeOrder = [2, 1, 3]

// 渲染排行榜主视图，业务数据和切换逻辑由页面容器传入。
export function RankingView({
  scope,
  metric,
  rankings,
  isLoading,
  errorMessage,
  myRanking,
  nextGapText,
  onScopeChange,
  onMetricChange,
}: RankingViewProps) {
  return (
    <main className={styles.page}>
      <RankingSidebar scope={scope} onScopeChange={onScopeChange} />

      <section className={styles.content}>
        <RankingTopbar scope={scope} />

        <div className={styles.panel}>
          <p className={styles.updateTip}>
            {scopeMap[scope].tip}
            <Info size={16} />
          </p>

          <MetricTabs metric={metric} onMetricChange={onMetricChange} />

          <TopThreeHonorCards rankings={rankings} metric={metric} isLoading={isLoading} />

          <RankingTable
            scope={scope}
            metric={metric}
            rankings={rankings}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />

          <MyRankingBar myRanking={myRanking} nextGapText={nextGapText} />
        </div>
      </section>
    </main>
  )
}

function RankingSidebar({
  scope,
  onScopeChange,
}: {
  scope: RankingScope
  onScopeChange: (scope: RankingScope) => void
}) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoBlock}>
        <Image
          src="/images/logo.png"
          alt="银河大乐骰 GALAXY DICE"
          width={316}
          height={95}
          priority
          className={styles.logoImage}
        />
      </div>

      <div className={styles.sidebarNavigation}>
        <h2 className={styles.sideTitle}>排行榜</h2>
        <nav className={styles.menu} aria-label="排行榜菜单">
          <button
            className={`${styles.menuItem} ${scope === 'total' ? styles.menuItemActive : ''}`}
            type="button"
            onClick={() => onScopeChange('total')}
          >
            <Trophy size={25} fill="currentColor" />
            总排行榜
          </button>
          <button
            className={`${styles.menuItem} ${scope === 'daily' ? styles.menuItemActive : ''}`}
            type="button"
            onClick={() => onScopeChange('daily')}
          >
            <CalendarDays size={25} />
            日排行榜
          </button>
        </nav>
      </div>

      <div className={styles.trophyArt} aria-hidden="true">
        <Image src="/images/class.png" alt="" fill sizes="22vw" className={styles.trophyImage} />
      </div>
    </aside>
  )
}

function RankingTopbar({ scope }: { scope: RankingScope }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.titleGroup}>
        <PageExitButton className={styles.backButton} label="返回" showLabel />
        <div>
          <h1>排行榜</h1>
          <p>{scope === 'total' ? '展示玩家在游戏中的综合表现与排名' : '查看玩家今日的竞技表现与排名'}</p>
        </div>
      </div>

      <div className={styles.actions} aria-label="顶部操作">
        <button className={styles.iconButton} type="button" aria-label="消息">
          <Mail />
          <span className={styles.badge}>1</span>
        </button>
        <button className={styles.iconButton} type="button" aria-label="好友">
          <Users />
        </button>
        <button className={styles.iconButton} type="button" aria-label="设置">
          <Settings />
        </button>
      </div>
    </header>
  )
}

function MetricTabs({
  metric,
  onMetricChange,
}: {
  metric: RankingMetric
  onMetricChange: (metric: RankingMetric) => void
}) {
  return (
    <div className={styles.tabs}>
      {rankingTabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`${styles.tab} ${metric === key ? styles.tabActive : ''}`}
          onClick={() => onMetricChange(key)}
        >
          <Icon size={22} fill="currentColor" />
          {label}
        </button>
      ))}
    </div>
  )
}

function TopThreeHonorCards({
  rankings,
  metric,
  isLoading,
}: {
  rankings: RankingItem[]
  metric: RankingMetric
  isLoading: boolean
}) {
  return (
    <section className={styles.topThree} aria-label="排行榜前三名">
      {topThreeOrder.map((rank) => {
        const item = rankings[rank - 1]

        return (
          <article
            key={rank}
            className={`${styles.honorCard} ${styles[`honorCardRank${rank}`]}`}
          >
            <div className={styles.honorMedal}>
              <Image
                src={rankMedalImages[rank]}
                alt={`第${rank}名`}
                width={76}
                height={76}
                className={styles.honorMedalImage}
              />
            </div>

            {item ? (
              <div className={styles.honorContent}>
                {renderAvatar(item, styles.honorAvatar)}
                <strong className={styles.honorName}>{getDisplayName(item)}</strong>
                <span className={styles.honorValue}>
                  {formatNumber(getRankingMetricValue(item, metric))}
                </span>
                <span className={styles.honorMetric}>{metricHeadMap[metric]}</span>
              </div>
            ) : (
              <span className={styles.honorEmpty}>{isLoading ? '同步中...' : '虚位以待'}</span>
            )}
          </article>
        )
      })}
    </section>
  )
}

function RankingTable({
  scope,
  metric,
  rankings,
  isLoading,
  errorMessage,
}: {
  scope: RankingScope
  metric: RankingMetric
  rankings: RankingItem[]
  isLoading: boolean
  errorMessage: string
}) {
  return (
    <div className={styles.tableCard}>
      <div className={`${styles.tableRow} ${styles.tableHead}`}>
        <span>排名</span>
        <span>玩家昵称</span>
        <RankingColumnHead metric={metric} targetMetric="wins" label="胜场数" />
        <RankingColumnHead metric={metric} targetMetric="totalGames" label="总场数" />
        <RankingColumnHead metric={metric} targetMetric="highestScore" label="最高分" />
        <span>胜率</span>
      </div>

      <div className={styles.tableBody}>
        {isLoading ? (
          <RankingEmptyRow text="正在加载排行榜..." />
        ) : errorMessage ? (
          <RankingEmptyRow text={errorMessage} />
        ) : rankings.length === 0 ? (
          <RankingEmptyRow text="暂无真实排行数据" />
        ) : rankings.length <= 3 ? (
          <RankingEmptyRow text="暂无更多排名" />
        ) : (
          rankings.slice(3).map((item, index) => (
            <RankingTableRow
              key={`${scope}-${metric}-${item.user_id}`}
              item={item}
              rank={index + 4}
              metric={metric}
            />
          ))
        )}
      </div>
    </div>
  )
}

function RankingColumnHead({
  metric,
  targetMetric,
  label,
}: {
  metric: RankingMetric
  targetMetric: RankingMetric
  label: string
}) {
  return (
    <span className={`${styles.columnHead} ${metric === targetMetric ? styles.sortedHead : ''}`}>
      {label}
    </span>
  )
}

function RankingEmptyRow({ text }: { text: string }) {
  return (
    <div className={`${styles.tableRow} ${styles.emptyRow}`}>
      <span />
      <span className={styles.playerCell}>
        <span className={styles.playerName}>{text}</span>
      </span>
      <span>-</span>
      <span>-</span>
      <span>-</span>
      <span>-</span>
    </div>
  )
}

function RankingTableRow({
  item,
  rank,
  metric,
}: {
  item: RankingItem
  rank: number
  metric: RankingMetric
}) {
  const level = getRankingLevel(item)
  const metricClassName = (targetMetric: RankingMetric) =>
    `${styles.metricNumber} ${metric === targetMetric ? styles.goldNumber : styles.normalNumber}`

  return (
    <div className={`${styles.tableRow} ${rank <= 3 ? styles.topRankRow : ''}`}>
      <span className={styles.rankCell}>
        {rank <= 3 ? (
          <span className={styles.medal}>
            <Image
              src={rankMedalImages[rank]}
              alt={`第${rank}名`}
              width={42}
              height={42}
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
      <span className={metricClassName('wins')}>{formatNumber(getRankingMetricValue(item, 'wins'))}</span>
      <span className={metricClassName('totalGames')}>{formatNumber(getRankingMetricValue(item, 'totalGames'))}</span>
      <span className={metricClassName('highestScore')}>{formatNumber(getRankingMetricValue(item, 'highestScore'))}</span>
      <span className={styles.winRateNumber}>{calculateWinRate(item)}</span>
    </div>
  )
}

function MyRankingBar({
  myRanking,
  nextGapText,
}: {
  myRanking: MyRanking | null
  nextGapText: string
}) {
  const item = myRanking?.item

  return (
    <footer className={styles.myRankCard}>
      <div className={styles.myRankLabel}>
        <span className={styles.myRankTitle}>我的排名</span>
        <strong className={styles.myRankValue}>{myRanking ? myRanking.rank : '-'}</strong>
      </div>
      <div className={styles.myPlayer}>
        {renderAvatar(item, styles.myAvatar)}
        <span className={styles.myName}>{item ? getDisplayName(item) : '-'}</span>
      </div>
      <MyStat label="胜场" value={item ? formatNumber(getRankingMetricValue(item, 'wins')) : '-'} />
      <MyStat label="总场" value={item ? formatNumber(getRankingMetricValue(item, 'totalGames')) : '-'} />
      <MyStat label="最高分" value={item ? formatNumber(getRankingMetricValue(item, 'highestScore')) : '-'} />
      <MyStat label="胜率" value={item ? calculateWinRate(item) : '-'} accent="pink" />
      <MyStat label="距离上一名" value={nextGapText} accent="gold" />
    </footer>
  )
}

function MyStat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'pink' | 'gold'
}) {
  return (
    <div className={styles.myStat}>
      <span>{label}：</span>
      <strong className={accent ? styles[`myStat${accent}`] : undefined}>{value}</strong>
    </div>
  )
}

function renderAvatar(item?: RankingItem, className = styles.avatar) {
  return (
    <span className={className}>
      <span className={styles.avatarImage} style={getAvatarStyle(item)} />
    </span>
  )
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

  if (!nickname && process.env.NODE_ENV === 'development') {
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

  if (!totalGames) return '0%'

  return `${((wins / totalGames) * 100).toFixed(1)}%`
}
