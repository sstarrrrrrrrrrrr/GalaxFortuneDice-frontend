'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  Award,
  BadgeCheck,
  ChevronRight,
  Dice5,
  Gamepad2,
  History,
  Mail,
  Medal,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { DEFAULT_AVATAR_SRC } from '@/utils/avatar'
import styles from './page.module.css'

const menuItems = [
  { label: '个人信息', icon: UserRound, active: true },
  { label: '历史战绩', icon: History },
  { label: '成就展示', icon: Star },
  { label: '游戏设置', icon: Dice5 },
  { label: '信誉积分', icon: ShieldCheck },
]

const recentMatches = [
  { result: '暂无', mode: '单人混战', score: 0, time: '--' },
  { result: '暂无', mode: '团队模式', score: 0, time: '--' },
  { result: '暂无', mode: '娱乐模式', score: 0, time: '--' },
]

export default function ProfilePage() {
  const currentUser = useCurrentUser()
  const nickname = currentUser?.nickname ?? '未登录玩家'
  const avatar = currentUser?.avatar || DEFAULT_AVATAR_SRC
  const exp = currentUser?.exp ?? 0
  const maxScore = currentUser?.max_score ?? currentUser?.highest_score ?? 0
  const totalWins = currentUser?.total_wins ?? currentUser?.win_count ?? currentUser?.wins ?? 0
  const totalGames = currentUser?.total_games ?? currentUser?.game_count ?? 0
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0
  const level = Math.floor(exp / 200) + 1
  const averageScore = totalGames > 0 ? Math.round(maxScore / totalGames) : 0

  const overviewStats = [
    { label: '最高分', value: maxScore, icon: Star, tone: 'gold' },
    { label: '总场数', value: totalGames, icon: Gamepad2, tone: 'cyan' },
    { label: '胜场数', value: totalWins, icon: Trophy, tone: 'pink' },
    { label: '胜率', value: `${winRate.toFixed(1)}%`, icon: BadgeCheck, tone: 'violet' },
    { label: '平均得分', value: averageScore, icon: Medal, tone: 'violet' },
    { label: '连胜记录', value: 0, icon: Users, tone: 'pink' },
    { label: '最大连胜', value: 0, icon: Sparkles, tone: 'violet' },
    { label: '四骰及以上', value: 0, icon: Award, tone: 'pink' },
  ]

  return (
    <main className={styles.page}>
      <Image src="/images/homepage-bg.png" alt="" fill priority className={styles.background} />
      <div className={styles.overlay} />

      <header className={styles.header}>
        <Link href="/lobby" className={styles.logoLink} aria-label="返回大厅">
          <Image src="/images/logo.png" alt="银河大乐骰" width={316} height={95} className={styles.logo} priority />
        </Link>
        <div className={styles.headerActions}>
          <button type="button" aria-label="消息"><Mail /></button>
          <button type="button" aria-label="好友"><Users /></button>
          <button type="button" aria-label="设置"><Settings /></button>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          {menuItems.map(({ label, icon: Icon, active }) => (
            <button key={label} type="button" className={active ? styles.activeMenu : ''}>
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        <section className={styles.content}>
          <div className={styles.topGrid}>
            <article className={`${styles.panel} ${styles.heroCard}`}>
              <div className={styles.avatarWrap}>
                <Image src={avatar} alt={nickname} fill sizes="104px" className={styles.avatar} />
              </div>
              <div className={styles.identity}>
                <div className={styles.nameLine}>
                  <h1>{nickname}</h1>
                  <span>ID: {currentUser?.id ?? 0}</span>
                </div>
                <span className={styles.titleBadge}><UserRound /> Lv.{level} 银河小队</span>
                <p>{currentUser?.phone ? `绑定手机：${currentUser.phone}` : '骰子在手，胜利我有！'}</p>
              </div>
            </article>

            <article className={`${styles.panel} ${styles.rankCard}`}>
              <Image src="/images/profile/rank-crest.png" alt="传奇大师徽章" width={627} height={627} />
              <strong>传奇大师</strong>
              <span><Star /> {exp}</span>
            </article>

            <aside className={`${styles.panel} ${styles.sideCard}`}>
              <h2>常用骰子</h2>
              <Image src="/images/profile/favorite-dice.png" alt="常用骰子" width={627} height={627} className={styles.artIcon} />
              <strong>暂无开放</strong>
              <span>完成更多对局后，可解锁</span>
            </aside>
          </div>

          <div className={styles.bodyGrid}>
            <div className={styles.mainColumn}>
              <article className={`${styles.panel} ${styles.overview}`}>
                <h2>数据总览</h2>
                <div className={styles.statsGrid}>
                  {overviewStats.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className={styles.statItem}>
                      <span className={styles[tone]}><Icon /> {label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className={`${styles.panel} ${styles.recent}`}>
                <div className={styles.panelTitle}>
                  <h2>最近战绩</h2>
                  <button type="button">查看所有 <ChevronRight /></button>
                </div>
                <div className={styles.matchList}>
                  {recentMatches.map((match, index) => (
                    <div key={`${match.mode}-${index}`} className={styles.matchRow}>
                      <span className={styles.matchResult}><Trophy /> {match.result}</span>
                      <span>{match.mode}</span>
                      <strong>{match.score} <Star /></strong>
                      <time>{match.time}</time>
                      <button type="button" aria-label="查看对局"><ChevronRight /></button>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className={styles.rightColumn}>
              <article className={`${styles.panel} ${styles.lockCard}`}>
                <h2>成就展示</h2>
                <Image src="/images/profile/achievement-medal.png" alt="成就徽章" width={627} height={627} className={styles.artIcon} />
                <strong>暂无开放</strong>
                <span>完成更多游戏后，可解锁</span>
              </article>
              <article className={`${styles.panel} ${styles.tagCard}`}>
                <div className={styles.panelTitle}><h2>个人标签</h2><button type="button">编辑</button></div>
                <Image src="/images/profile/profile-tag.png" alt="个人标签" width={627} height={627} className={styles.artIcon} />
                <strong>暂无开放</strong>
                <span>完成更多游戏后，可解锁</span>
              </article>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
