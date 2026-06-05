import Image from 'next/image'
import { type CSSProperties } from 'react'
import { CalendarDays, ChevronDown, Dice5, Info, Mail, Settings, Star, Trophy, Users } from 'lucide-react'
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

export const metricHeadMap: Record<RankingMetric, string> = {
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

// 渲染排行榜主视图，包括榜单范围、指标切换、榜单表格和我的排名。
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
}: {
  scope: RankingScope
  metric: RankingMetric
  rankings: RankingItem[]
  isLoading: boolean
  errorMessage: string
  myRanking: MyRanking | null
  nextGapText: string
  onScopeChange: (scope: RankingScope) => void
  onMetricChange: (metric: RankingMetric) => void
}) {
  const myItem = myRanking?.item
  const myLevel = myItem ? getRankingLevel(myItem) : null

  return (
    <main className={styles.page}>
      <RankingSidebar scope={scope} onScopeChange={onScopeChange} />

      <section className={styles.content}>
        <RankingTopbar />

        <div className={styles.panel}>
          <p className={styles.updateTip}>
            {scopeMap[scope].tip}
            <Info size={18} />
          </p>

          <MetricTabs metric={metric} onMetricChange={onMetricChange} />

          <RankingTable
            scope={scope}
            metric={metric}
            rankings={rankings}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />

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

// 渲染排行榜左侧导航，负责总榜/日榜切换。
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
        <Image src="/images/logo.png" alt="银河大乐骰 GALAXY DICE" width={316} height={95} priority className={styles.logoImage} />
      </div>

      <h1 className={styles.sideTitle}>排行榜</h1>

      <nav className={styles.menu} aria-label="排行榜菜单">
        <button
          className={`${styles.menuItem} ${scope === 'total' ? styles.menuItemActive : ''}`}
          type="button"
          onClick={() => onScopeChange('total')}
        >
          <Trophy size={28} fill="currentColor" />
          总排行榜
        </button>
        <button
          className={`${styles.menuItem} ${scope === 'daily' ? styles.menuItemActive : ''}`}
          type="button"
          onClick={() => onScopeChange('daily')}
        >
          <CalendarDays size={28} />
          日排行榜
        </button>
      </nav>

      <div className={styles.trophyArt} aria-hidden="true">
        <Image src="/images/class.png" alt="" fill sizes="22vw" className={styles.trophyImage} />
      </div>
    </aside>
  )
}

// 渲染排行榜顶部图标操作区。
function RankingTopbar() {
  return (
    <header className={styles.topbar}>
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

// 渲染排行榜指标标签，用于切换胜场、总场数和最高分排序。
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
          <Icon size={26} fill="currentColor" />
          {label}
        </button>
      ))}
    </div>
  )
}

// 渲染排行榜表格，并处理加载、错误和空数据状态。
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
      </div>

      <div className={styles.tableBody}>
        {isLoading ? (
          <RankingEmptyRow text="正在加载排行榜..." />
        ) : errorMessage ? (
          <RankingEmptyRow text={errorMessage} />
        ) : rankings.length === 0 ? (
          <RankingEmptyRow text="暂无真实排行数据" />
        ) : (
          rankings.map((item, index) => (
            <RankingTableRow
              key={`${scope}-${metric}-${item.user_id}`}
              item={item}
              rank={index + 1}
            />
          ))
        )}
      </div>
    </div>
  )
}

// 渲染表头中的排序指标标记。
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
      {metric === targetMetric ? <ChevronDown size={15} /> : null}
    </span>
  )
}

// 渲染排行榜空状态或错误状态行。
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
    </div>
  )
}

// 渲染排行榜中的单个玩家数据行。
function RankingTableRow({ item, rank }: { item: RankingItem; rank: number }) {
  const level = getRankingLevel(item)

  return (
    <div className={styles.tableRow}>
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
}

// 渲染玩家头像，统一使用背景图以复用 CSS 形状。
function renderAvatar(item?: RankingItem, className = styles.avatar) {
  return (
    <span className={className}>
      <span className={styles.avatarImage} style={getAvatarStyle(item)} />
    </span>
  )
}

// 格式化排行榜数字，异常数字显示为占位符。
function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : '-'
}

// 从不同后端字段中读取玩家等级。
function getRankingLevel(item: RankingItem) {
  if (typeof item.level === 'number') return item.level
  if (typeof item.lv === 'number') return item.lv
  if (typeof item.exp === 'number') return Math.floor(item.exp / 200) + 1

  return null
}

// 获取排行榜展示昵称，开发环境下提示缺失昵称的数据。
function getDisplayName(item: RankingItem) {
  const nickname = getRankingNickname(item)

  if (!nickname && process.env.NODE_ENV === 'development') {
    console.warn('[ranking-page] nickname missing', item)
  }

  return nickname || '匿名玩家'
}

// 生成头像背景图样式。
function getAvatarStyle(item?: RankingItem): CSSProperties {
  return {
    backgroundImage: `url("${normalizeAvatarSrc(item?.avatar)}")`,
  }
}

// 根据胜场和总场数计算胜率。
function calculateWinRate(item: RankingItem) {
  const wins = getRankingMetricValue(item, 'wins')
  const totalGames = getRankingMetricValue(item, 'totalGames')

  if (!totalGames) return '-'

  return `${((wins / totalGames) * 100).toFixed(1)}%`
}
