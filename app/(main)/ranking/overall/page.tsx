import Image from 'next/image'
import {
  CalendarDays,
  ChevronDown,
  Dice5,
  Info,
  Mail,
  Settings,
  Star,
  Trophy,
  Users,
} from 'lucide-react'
import styles from './page.module.css'

interface RankingTab {
  label: string
  icon: typeof Trophy
  active?: boolean
}

const rankingTabs: RankingTab[] = [
  { label: '总场数', icon: Trophy, active: true },
  { label: '总场数', icon: Dice5 },
  { label: '最高分', icon: Star },
]

export default function OverallRankingPage() {
  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.logoBlock}>
          <Image src="/images/logo.png" alt="银河大乐殿 GALAXY DICE" width={316} height={95} priority className={styles.logoImage} />
        </div>

        <h1 className={styles.sideTitle}>排行榜</h1>

        <nav className={styles.menu} aria-label="排行榜菜单">
          <a className={`${styles.menuItem} ${styles.menuItemActive}`} href="/ranking/overall">
            <Trophy size={22} fill="currentColor" />
            总排行榜
          </a>
          <a className={styles.menuItem} href="/ranking/daily">
            <CalendarDays size={22} />
            日排行榜
          </a>
        </nav>

        <div className={styles.trophyArt} aria-hidden="true">
          <Image src="/images/class.png" alt="" fill sizes="20vw" className={styles.trophyImage} />
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.actions} aria-label="顶部操作">
            <button className={styles.iconButton} type="button" aria-label="消息">
              <Mail size={21} />
              <span className={styles.badge}>1</span>
            </button>
            <button className={styles.iconButton} type="button" aria-label="好友">
              <Users size={22} />
            </button>
            <button className={styles.iconButton} type="button" aria-label="设置">
              <Settings size={23} />
            </button>
          </div>
        </header>

        <div className={styles.panel}>
          <p className={styles.updateTip}>
            排行榜每10分钟更新一次
            <Info size={15} />
          </p>

          <div className={styles.tabs}>
            {rankingTabs.map(({ label, icon: Icon, active }) => (
              <button key={`${label}-${Icon.displayName ?? Icon.name}`} type="button" className={`${styles.tab} ${active ? styles.tabActive : ''}`}>
                <Icon size={18} fill="currentColor" />
                {label}
              </button>
            ))}
          </div>

          <div className={styles.tableCard}>
            <div className={`${styles.tableRow} ${styles.tableHead}`}>
              <span>排名</span>
              <span>玩家昵称</span>
              <span className={styles.sortedHead}>
                胜场数
                <ChevronDown size={14} />
              </span>
              <span>总场数</span>
              <span>最高分</span>
            </div>

            <div className={styles.tableBody}>
              <div className={styles.tableRow}>
                <span />
                <span className={styles.playerCell}>
                  <span className={styles.playerName}>暂无真实排行数据</span>
                </span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
              </div>
            </div>
          </div>

          <footer className={styles.myRankCard}>
            <div className={styles.myRankLabel}>
              <span>我的排名</span>
              <strong>-</strong>
            </div>
            <div className={styles.myStat}>
              <span>胜场数</span>
              <strong>-</strong>
            </div>
            <div className={styles.myStat}>
              <span>总场数</span>
              <strong>-</strong>
            </div>
            <div className={styles.myStat}>
              <span>最高分</span>
              <strong>-</strong>
            </div>
            <div className={styles.winRate}>
              <span>胜率</span>
              <strong>-</strong>
            </div>
          </footer>
        </div>
      </section>
    </main>
  )
}
