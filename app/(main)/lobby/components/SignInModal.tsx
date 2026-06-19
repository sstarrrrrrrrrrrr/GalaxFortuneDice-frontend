'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { Check, CircleHelp, Sparkles, X } from 'lucide-react'
import styles from './SignInModal.module.css'

interface SignInModalProps {
  open: boolean
  onClose: () => void
}

interface SignReward {
  day: number
  name: string
  amount: string
  image: string
  signed?: boolean
  current?: boolean
  special?: boolean
}

interface MilestoneReward {
  days: number
  amount: string
  image: string
}

const signRewards: SignReward[] = [
  {
    day: 1,
    name: '金币',
    amount: 'x100',
    image: '/images/signin/coin-reward.png',
    signed: true,
  },
  {
    day: 2,
    name: '经验',
    amount: 'x150',
    image: '/images/signin/exp-badge.png',
  },
  {
    day: 3,
    name: '金币',
    amount: 'x200',
    image: '/images/signin/coin-reward.png',
  },
  {
    day: 4,
    name: '随机宝箱',
    amount: 'x1',
    image: '/images/signin/mystery-box.png',
  },
  {
    day: 5,
    name: '经验',
    amount: 'x300',
    image: '/images/signin/exp-badge.png',
  },
  {
    day: 6,
    name: '金币',
    amount: 'x300',
    image: '/images/signin/coin-reward.png',
  },
  {
    day: 7,
    name: '高级宝箱',
    amount: 'x1',
    image: '/images/signin/premium-chest.png',
    current: true,
    special: true,
  },
]

const milestoneRewards: MilestoneReward[] = [
  { days: 3, amount: 'x200', image: '/images/signin/coin-reward.png' },
  { days: 7, amount: 'x300', image: '/images/signin/exp-badge.png' },
  { days: 14, amount: 'x1', image: '/images/signin/mystery-box.png' },
  { days: 21, amount: 'x500', image: '/images/signin/coin-reward.png' },
  { days: 28, amount: 'x1', image: '/images/signin/premium-chest.png' },
]

export function SignInModal({ open, onClose }: SignInModalProps) {
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className={styles.modalRoot} role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-modal-title"
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.frame}>
          <svg
            className={styles.panelShape}
            viewBox="0 0 940 540"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sign-panel-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#111c79" />
                <stop offset="0.5" stopColor="#0b145e" />
                <stop offset="1" stopColor="#070c42" />
              </linearGradient>
              <linearGradient id="sign-panel-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#536fff" />
                <stop offset="0.35" stopColor="#aa5cff" />
                <stop offset="0.7" stopColor="#5c58ff" />
                <stop offset="1" stopColor="#a24fff" />
              </linearGradient>
              <filter id="sign-panel-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              className={styles.panelFill}
              d="M28 22 Q17 22 11 32 Q7 38 7 49 L7 487 Q7 499 15 507 Q21 513 31 513 L118 513 Q127 513 133 506 L140 497 L260 497 Q269 497 275 504 L282 513 L368 513 Q377 513 383 520 L390 529 L550 529 Q559 529 565 520 L572 513 L658 513 Q667 513 673 504 L680 497 L800 497 Q809 497 815 506 L822 513 L909 513 Q919 513 925 507 Q933 499 933 487 L933 49 Q933 38 929 32 Q923 22 912 22 L870 22 Q862 22 858 15 L851 6 L745 6 Q737 6 732 13 L726 22 L278 22 Q270 22 265 15 L258 6 L100 6 Q92 6 87 13 L81 22 Z"
            />
            <path
              className={styles.panelBorder}
              d="M28 22 Q17 22 11 32 Q7 38 7 49 L7 487 Q7 499 15 507 Q21 513 31 513 L118 513 Q127 513 133 506 L140 497 L260 497 Q269 497 275 504 L282 513 L368 513 Q377 513 383 520 L390 529 L550 529 Q559 529 565 520 L572 513 L658 513 Q667 513 673 504 L680 497 L800 497 Q809 497 815 506 L822 513 L909 513 Q919 513 925 507 Q933 499 933 487 L933 49 Q933 38 929 32 Q923 22 912 22 L870 22 Q862 22 858 15 L851 6 L745 6 Q737 6 732 13 L726 22 L278 22 Q270 22 265 15 L258 6 L100 6 Q92 6 87 13 L81 22 Z"
            />
            <path
              className={styles.panelInnerBorder}
              d="M31 27 Q22 27 17 35 Q13 41 13 50 L13 484 Q13 494 20 501 Q25 507 34 507 L115 507 Q124 507 130 500 L137 491 L263 491 Q272 491 279 499 L285 507 L365 507 Q374 507 380 515 L387 522 L553 522 Q562 522 568 515 L575 507 L655 507 Q664 507 671 499 L677 491 L803 491 Q812 491 818 500 L825 507 L906 507 Q915 507 920 501 Q927 494 927 484 L927 50 Q927 41 923 35 Q918 27 909 27 L867 27 Q856 27 851 18 L847 12 L748 12 Q739 12 734 19 L728 27 L276 27 Q267 27 261 19 L255 12 L103 12 Q94 12 89 19 L83 27 Z"
            />
          </svg>
          <div className={styles.topGlow} />
          <div className={styles.particleField} aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} />
            ))}
          </div>

          <header className={styles.header}>
            <div className={styles.titleGroup}>
              <span className={styles.titleBadge}>
                <Sparkles />
              </span>
              <div>
                <h2 id="sign-in-modal-title">每日签到</h2>
                <p>连续签到领取丰厚奖励</p>
              </div>
            </div>

            <div className={styles.headerArt} aria-hidden="true">
              <span className={styles.orbit} />
              <Image
                src="/images/signin/galaxy-gift.png"
                alt=""
                width={180}
                height={180}
                className={styles.giftImage}
              />
              <Image
                src="/images/signin/galaxy-crystal.png"
                alt=""
                width={106}
                height={106}
                className={styles.crystalImage}
              />
            </div>

            <button type="button" aria-label="关闭签到弹窗" onClick={onClose} className={styles.closeButton}>
              <X />
            </button>
          </header>

        <section className={styles.dailyRewards} aria-label="七天签到奖励">
          {signRewards.map((reward) => (
            <SignRewardCard key={reward.day} reward={reward} />
          ))}
        </section>

        <section className={styles.monthlyPanel}>
          <div className={styles.monthlySummary}>
            <div className={styles.monthlyTitle}>
              本月累计签到
              <CircleHelp />
            </div>
            <div className={styles.dayCount}>
              <strong>1</strong>
              <span>天</span>
            </div>
            <p>
              本月可补签 1 次
              <span className={styles.ticket}>补</span>
            </p>
          </div>

          <div className={styles.progressArea}>
            <div className={styles.milestones}>
              {milestoneRewards.map((reward, index) => (
                <SignMilestoneReward key={reward.days} reward={reward} index={index} />
              ))}
            </div>
            <div className={styles.progressTrack}>
              <span className={styles.progressFill} />
              {milestoneRewards.map((reward, index) => (
                <span
                  key={reward.days}
                  className={`${styles.trackNode} ${index === 0 ? styles.activeNode : ''}`}
                  style={{ left: `${index * 25}%` }}
                />
              ))}
            </div>
            <div className={styles.milestoneDays}>
              {milestoneRewards.map((reward, index) => (
                <span key={reward.days} className={index === 0 ? styles.activeDay : ''}>
                  {reward.days}天
                </span>
              ))}
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>每日 00:00 刷新签到进度，记得每天来领取奖励</span>
          <button type="button" className={styles.signButton}>
            今日已签到
          </button>
        </footer>
        </div>
      </section>
    </div>
  )
}

function SignRewardCard({ reward }: { reward: SignReward }) {
  return (
    <article
      className={`${styles.rewardCard} ${reward.signed ? styles.signedCard : ''} ${
        reward.current ? styles.currentCard : ''
      } ${reward.special ? styles.specialCard : ''}`}
    >
      <div className={styles.rewardDay}>第 {reward.day} 天</div>
      <div className={styles.rewardVisual}>
        <Image
          src={reward.image}
          alt={reward.name}
          width={150}
          height={150}
          className={styles.rewardImage}
        />
      </div>
      <div className={styles.rewardName}>{reward.name}</div>
      <strong className={styles.rewardAmount}>{reward.amount}</strong>
      <div className={styles.rewardStatus}>
        {reward.signed ? (
          <>
            <Check />
            已签到
          </>
        ) : (
          '待签到'
        )}
      </div>
    </article>
  )
}

function SignMilestoneReward({
  reward,
  index,
}: {
  reward: MilestoneReward
  index: number
}) {
  return (
    <div className={`${styles.milestoneReward} ${index === 0 ? styles.activeMilestone : ''}`}>
      <Image src={reward.image} alt="" width={80} height={80} />
      <span>{reward.amount}</span>
    </div>
  )
}
