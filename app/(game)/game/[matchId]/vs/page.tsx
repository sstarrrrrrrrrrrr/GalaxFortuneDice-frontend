'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { readMatchSnapshot, startMatch, type MatchInfoPlayer } from '@/services/match'
import { normalizeAvatarSrc } from '@/utils/avatar'
import { connectMatchChannel } from '@/websocket/match'

type Player = {
  id: number
  name: string
  avatar?: string
  emoji?: string
  level: number
  title?: string
  bestScore: number
  wins: number
  rate: string
}

type Barrage = {
  id: number
  text: string
  top: number
}

const modeConfig: Record<string, { name: string; layout: 'duel' | 'three' | 'four' | 'team' }> = {
  'solo-2p': { name: '2人对战', layout: 'duel' },
  'solo-3p': { name: '3人混战', layout: 'three' },
  'solo-4p': { name: '4人混战', layout: 'four' },
  'team-2v2': { name: '2V2 组队', layout: 'team' },
  'team-3v3': { name: '3V3 组队', layout: 'team' },
  'team-5v5': { name: '5V5 组队', layout: 'team' },
}

const quickMessages = ['加油！', '稳了！', '666', '这把稳了', '冲冲冲！']

const particles = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: 8 + ((index * 17) % 84),
  top: 14 + ((index * 23) % 68),
  size: 2 + (index % 4),
  delay: (index % 9) * 0.28,
  duration: 3.8 + (index % 6) * 0.42,
  opacity: 0.2 + (index % 5) * 0.08,
}))

function normalizeMatchPlayer(player: MatchInfoPlayer): Player {
  return {
    id: player.user_id,
    name: player.nickname,
    avatar: normalizeAvatarSrc(player.avatar) || '/images/login/default-avatar.png',
    level: player.exp ?? 0,
    title: player.team_id ? `T${player.team_id}` : undefined,
    bestScore: 0,
    wins: 0,
    rate: '0.0%',
  }
}

export default function VsLoadingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const matchId = params?.matchId as string
  const modeKey = searchParams.get('mode') ?? 'solo-2p'
  const isHostView = searchParams.get('role') === 'host'
  const isGuestView = searchParams.get('guest') === 'true'
  const mode = modeConfig[modeKey] ?? modeConfig['solo-2p']
  const [phase, setPhase] = useState<'enter' | 'ready'>('enter')
  const [barrages, setBarrages] = useState<Barrage[]>([])
  const [matchPlayers] = useState<Player[]>(() => readMatchSnapshot(matchId)?.players.map(normalizeMatchPlayer) ?? [])
  const barrageIdRef = useRef(0)
  const hasStartedMatchRef = useRef(false)
  const displayPlayers = useMemo(
    () => {
      if (matchPlayers.length > 0) return matchPlayers
      if (!currentUser) return []

      return [
        {
          id: currentUser.id,
          name: currentUser.nickname,
          avatar: normalizeAvatarSrc(currentUser.avatar) || '/images/login/default-avatar.png',
          level: 0,
          bestScore: 0,
          wins: 0,
          rate: '0.0%',
        },
      ]
    },
    [currentUser, matchPlayers],
  )

  useEffect(() => {
    if (!matchId || isGuestView) return

    return connectMatchChannel({
      matchId,
      onOpen: () => {
        if (!isHostView || hasStartedMatchRef.current) return

        hasStartedMatchRef.current = true
        void startMatch({ match_id: matchId }).catch((error) => {
          hasStartedMatchRef.current = false

          if (process.env.NODE_ENV === 'development') {
            console.error('[start match error]', error)
          }
        })
      },
      onMessage: ({ rawType, message }) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[vs match event]', { rawType, message })
        }
      },
    })
  }, [isGuestView, isHostView, matchId])

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setPhase('ready'), 900)
    const redirectTimer = window.setTimeout(() => {
      router.push(`/game/${matchId}?mode=${modeKey}&role=${isHostView ? 'host' : 'player'}${isGuestView ? '&guest=true' : ''}`)
    }, 5200)

    return () => {
      window.clearTimeout(readyTimer)
      window.clearTimeout(redirectTimer)
    }
  }, [isGuestView, isHostView, matchId, modeKey, router])

  function sendBarrage(text: string) {
    const id = Date.now() + barrageIdRef.current
    const top = 18 + ((barrageIdRef.current * 13) % 42)
    barrageIdRef.current += 1
    setBarrages((current) => [...current, { id, text, top }])
    window.setTimeout(() => {
      setBarrages((current) => current.filter((item) => item.id !== id))
    }, 4300)
  }

  return (
    <main className="relative h-screen min-h-[560px] w-screen min-w-[960px] overflow-hidden bg-[#03052d] text-white">
      <Image src="/images/room-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(107,88,255,0.24),transparent_34%),linear-gradient(180deg,rgba(3,5,38,0.2),rgba(3,5,38,0.56))]" />
      <div className="absolute inset-x-[13%] top-[15%] h-[58%] rounded-full bg-[#5d55ff]/8 blur-[70px]" />
      <LightRays />
      <ParticleField />

      <div className="absolute left-1/2 top-[6.4%] z-30 -translate-x-1/2 rounded-full border border-white/14 bg-[#060546]/70 px-[4vw] py-[1vh] text-[clamp(15px,1.25vw,22px)] font-black shadow-[0_12px_28px_rgba(2,5,38,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px]">
        {mode.name}
      </div>

      <BarrageLayer barrages={barrages} />

      <section className="absolute inset-x-0 top-[16.2%] z-20 flex h-[62vh] items-center justify-center">
        {mode.layout === 'three' && <ThreeLayout players={displayPlayers.slice(0, 3)} phase={phase} />}
        {mode.layout === 'four' && <FourLayout players={displayPlayers.slice(0, 4)} phase={phase} />}
        {mode.layout === 'team' && <TeamLayout players={displayPlayers.slice(0, 4)} phase={phase} />}
        {mode.layout === 'duel' && <DuelLayout players={displayPlayers.slice(0, 2)} phase={phase} />}
      </section>

      <QuickMessages messages={quickMessages} onSend={sendBarrage} />

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: phase === 'ready' ? 1 : 0.62, y: 0 }}
        transition={{ delay: 0.8, duration: 0.45 }}
        className="absolute bottom-[5.8%] left-1/2 z-30 -translate-x-1/2 text-[clamp(13px,1.05vw,18px)] font-black tracking-[0.04em] text-white/72 [text-shadow:0_0_7px_rgba(80,100,255,0.72)]"
      >
        准备好了？胜利属于你！
      </motion.p>
    </main>
  )
}

function LightRays() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute left-[8%] top-[21%] h-[1px] w-[42vw] origin-left rotate-[-18deg] bg-[linear-gradient(90deg,transparent,rgba(123,146,255,0.22),rgba(255,255,255,0.2),transparent)] blur-[0.5px]"
        animate={{ opacity: [0.1, 0.28, 0.1], x: [0, 18, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute right-[6%] top-[25%] h-[1px] w-[36vw] origin-right rotate-[-32deg] bg-[linear-gradient(90deg,transparent,rgba(164,94,255,0.18),rgba(92,232,255,0.2),transparent)] blur-[0.5px]"
        animate={{ opacity: [0.08, 0.23, 0.08], x: [0, -16, 0] }}
        transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />
      <motion.div
        aria-hidden
        className="absolute left-[38%] top-[10%] h-[58vh] w-[1px] rotate-[23deg] bg-[linear-gradient(180deg,transparent,rgba(132,137,255,0.14),transparent)]"
        animate={{ opacity: [0.07, 0.18, 0.07] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
    </div>
  )
}

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          aria-hidden
          key={particle.id}
          className="absolute rounded-full bg-white shadow-[0_0_10px_rgba(124,160,255,0.75)]"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
          }}
          animate={{ y: [0, -12, 0], opacity: [particle.opacity * 0.55, particle.opacity, particle.opacity * 0.55] }}
          transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function BarrageLayer({ barrages }: { barrages: Barrage[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <AnimatePresence>
        {barrages.map((item) => (
          <motion.div
            key={item.id}
            initial={{ x: '112vw', opacity: 0 }}
            animate={{ x: '-34vw', opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 4.1, ease: 'linear' }}
            className="absolute rounded-full border border-white/14 bg-[#0b1458]/58 px-[16px] py-[6px] text-[clamp(12px,0.82vw,15px)] font-bold text-white/88 shadow-[0_8px_18px_rgba(2,5,38,0.24),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-[8px]"
            style={{ top: `${item.top}%` }}
          >
            {item.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function DuelLayout({ players, phase }: { players: Player[]; phase: string }) {
  return (
    <div className="grid w-[74%] max-w-[980px] grid-cols-[1fr_auto_1fr] items-center gap-[5vw]">
        <AnimatedCard delay={0.05} phase={phase} direction={-1}>
        <PlayerCard player={players[0]} />
      </AnimatedCard>
      <VsMark />
        <AnimatedCard delay={0.14} phase={phase} direction={1}>
        <PlayerCard player={players[1]} />
      </AnimatedCard>
    </div>
  )
}

function TeamLayout({ players, phase }: { players: Player[]; phase: string }) {
  return (
    <div className="grid w-[78%] max-w-[1080px] grid-cols-[1fr_auto_1fr] items-center gap-[4vw]">
      <TeamPanel title="蓝队" tone="blue" players={players.slice(0, 2)} phase={phase} />
      <VsMark />
      <TeamPanel title="红队" tone="red" players={players.slice(2, 4)} phase={phase} />
    </div>
  )
}

function ThreeLayout({ players, phase }: { players: Player[]; phase: string }) {
  return (
    <div className="relative h-[52vh] min-h-[360px] w-[52vw] min-w-[580px] max-w-[760px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.86 }}
        animate={{ opacity: 1, scale: phase === 'ready' ? 1 : 0.96 }}
        transition={{ duration: 0.55 }}
        className="absolute left-1/2 top-1/2 h-[20vw] max-h-[310px] min-h-[230px] w-[20vw] min-w-[230px] max-w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/16 bg-[conic-gradient(from_30deg,rgba(72,112,255,0.72)_0_120deg,rgba(255,198,61,0.7)_120deg_240deg,rgba(128,76,255,0.72)_240deg_360deg)] p-[10px] shadow-[0_18px_44px_rgba(2,5,38,0.32),inset_0_1px_0_rgba(255,255,255,0.2)]"
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#070b46]/84 backdrop-blur-[6px]">
          <span className="text-[clamp(42px,5vw,76px)] font-black italic text-white/92 [text-shadow:0_0_18px_rgba(130,145,255,0.72)]">VS</span>
        </div>
      </motion.div>
      <div className="absolute left-1/2 top-0 w-[230px] -translate-x-1/2">
        <AnimatedCard delay={0.02} phase={phase} direction={-1}><PlayerCard player={players[0]} compact /></AnimatedCard>
      </div>
      <div className="absolute bottom-[2%] left-0 w-[230px]">
        <AnimatedCard delay={0.12} phase={phase} direction={-1}><PlayerCard player={players[1]} compact /></AnimatedCard>
      </div>
      <div className="absolute bottom-[2%] right-0 w-[230px]">
        <AnimatedCard delay={0.2} phase={phase} direction={1}><PlayerCard player={players[2]} compact /></AnimatedCard>
      </div>
    </div>
  )
}

function FourLayout({ players, phase }: { players: Player[]; phase: string }) {
  return (
    <div className="relative grid w-[58vw] min-w-[650px] max-w-[880px] grid-cols-2 gap-[1.4vw]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/16 bg-[#081052]/78 text-[clamp(30px,3.2vw,48px)] font-black italic shadow-[0_16px_34px_rgba(2,5,38,0.32),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[10px]">
        VS
      </div>
      {players.map((player, index) => (
        <AnimatedCard key={player.id} delay={index * 0.08} phase={phase} direction={index % 2 === 0 ? -1 : 1}>
          <PlayerCard player={player} compact />
        </AnimatedCard>
      ))}
    </div>
  )
}

function TeamPanel({
  title,
  tone,
  players,
  phase,
}: {
  title: string
  tone: 'blue' | 'red'
  players: Player[]
  phase: string
}) {
  const isBlue = tone === 'blue'

  return (
    <motion.div
      initial={{ opacity: 0, x: isBlue ? -160 : 160, scale: 0.96 }}
      animate={{ opacity: 1, x: phase === 'ready' ? 0 : isBlue ? 20 : -20, scale: phase === 'ready' ? 1 : 1.02 }}
      transition={{ duration: 0.62, ease: [0.2, 0.9, 0.2, 1], delay: isBlue ? 0.04 : 0.12 }}
      className={`rounded-[18px] border p-[16px] shadow-[0_18px_42px_rgba(2,5,38,0.32),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px] ${
        isBlue
          ? 'border-[#65a5ff]/28 bg-[#082f78]/42'
          : 'border-[#ff6d88]/28 bg-[#65102c]/38'
      }`}
    >
      <div className="mb-[16px] flex items-center justify-between">
        <span className="text-[clamp(15px,1.1vw,20px)] font-black">{title}</span>
        <span className={`h-[3px] w-[58px] rounded-full ${isBlue ? 'bg-[#65a5ff]' : 'bg-[#ff6d88]'}`} />
      </div>
      <div className="grid gap-[14px]">
        {players.map((player, index) => (
          <AnimatedCard key={player.id} delay={0.08 + index * 0.08} phase={phase}>
            <PlayerCard player={player} compact />
          </AnimatedCard>
        ))}
      </div>
    </motion.div>
  )
}

function AnimatedCard({
  children,
  delay,
  phase,
  direction = 0,
}: {
  children: React.ReactNode
  delay: number
  phase: string
  direction?: -1 | 0 | 1
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 170, y: 18, scale: 0.94, rotate: direction * -2 }}
      animate={{
        opacity: 1,
        x: phase === 'ready' ? 0 : direction * -18,
        y: 0,
        scale: phase === 'ready' ? 1 : 1.02,
        rotate: phase === 'ready' ? 0 : direction * 1,
      }}
      transition={{ delay, duration: 0.62, ease: [0.2, 0.9, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

function VsMark() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: [0.86, 1.08, 1] }}
      transition={{ delay: 0.3, duration: 0.58, ease: 'easeOut' }}
      className="relative flex h-[13vw] max-h-[178px] min-h-[124px] w-[13vw] min-w-[124px] max-w-[178px] items-center justify-center"
    >
      <motion.div
        className="absolute left-1/2 top-1/2 h-[2px] w-[19vw] max-w-[260px] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(112,136,255,0.34),transparent)]"
        animate={{ opacity: [0.12, 0.34, 0.12], scaleX: [0.72, 1, 0.72] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 rounded-full bg-[#786aff]/10 blur-[30px]" />
      <div className="relative flex h-[72%] w-[72%] items-center justify-center rounded-full border border-white/14 bg-[#081052]/66 shadow-[0_16px_32px_rgba(2,5,38,0.26),inset_0_1px_0_rgba(255,255,255,0.13)] backdrop-blur-[10px]">
        <span className="text-[clamp(38px,4.7vw,74px)] font-black italic text-white/92 [text-shadow:0_0_10px_rgba(130,145,255,0.54)]">VS</span>
      </div>
    </motion.div>
  )
}

function PlayerCard({ player, compact = false }: { player?: Player; compact?: boolean }) {
  if (!player) {
    return (
      <article
        className={`relative flex items-center justify-center overflow-hidden rounded-[16px] border border-dashed border-white/16 bg-[#091052]/38 text-white/45 shadow-[0_16px_34px_rgba(2,5,38,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[10px] ${
          compact ? 'min-h-[168px] p-[14px]' : 'min-h-[320px] p-[22px]'
        }`}
      >
        <span className="text-[clamp(13px,0.95vw,18px)] font-black">等待玩家</span>
      </article>
    )
  }

  return (
    <article
      className={`relative overflow-hidden rounded-[16px] border border-white/16 bg-[#091052]/68 text-white shadow-[0_16px_34px_rgba(2,5,38,0.28),inset_0_1px_0_rgba(255,255,255,0.13)] backdrop-blur-[10px] ${
        compact ? 'min-h-[168px] p-[14px]' : 'min-h-[320px] p-[22px]'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40%] bg-[linear-gradient(180deg,rgba(255,255,255,0.11),transparent)]" />
      <div className="relative flex items-center gap-[14px]">
        <div className={`${compact ? 'h-[58px] w-[58px]' : 'h-[86px] w-[86px]'} relative shrink-0 overflow-hidden rounded-full border-2 border-[#8fa0ff]/70 bg-[#15156a] shadow-[0_0_18px_rgba(114,129,255,0.46)]`}>
          {player.avatar ? (
            <Image src={player.avatar} alt={player.name} fill sizes="86px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#ffe27a,#0d2b78_72%)] text-[clamp(16px,1.5vw,24px)] font-black">
              {player.emoji}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[clamp(14px,1.05vw,20px)] font-black">{player.name}</h2>
          <div className="mt-[5px] flex items-center gap-[8px] text-[clamp(10px,0.72vw,13px)] font-bold text-white/66">
            <span>Lv.{player.level}</span>
            {player.title && <span className="text-[#56e8ff]">{player.title}</span>}
          </div>
        </div>
      </div>

      <div className={`relative ${compact ? 'mt-[14px]' : 'mt-[26px]'} grid gap-[9px] text-[clamp(11px,0.78vw,15px)] font-bold`}>
        <StatRow label="最高分" value={player.bestScore} highlight />
        <StatRow label="胜场数" value={player.wins} />
        <StatRow label="胜率" value={player.rate} />
      </div>
    </article>
  )
}

function StatRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[16px] rounded-[8px] bg-white/6 px-[10px] py-[7px]">
      <span className="text-white/62">{label}</span>
      <span className={highlight ? 'text-[#ffe072]' : 'text-white/88'}>{value}</span>
    </div>
  )
}

function QuickMessages({ messages, onSend }: { messages: string[]; onSend: (message: string) => void }) {
  return (
    <section className="absolute bottom-[4.8%] left-[2.8%] z-30 w-[23vw] min-w-[260px]">
      <div className="mb-[0.8vh] text-[clamp(12px,0.86vw,15px)] font-black text-white/78 [text-shadow:0_0_6px_rgba(83,92,255,0.72)]">快捷消息</div>
      <div className="grid grid-cols-3 gap-[8px] rounded-[10px] border border-white/12 bg-[#081052]/46 p-[9px] shadow-[0_10px_22px_rgba(2,5,38,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[10px]">
        {messages.map((message) => (
          <button
            type="button"
            key={message}
            onClick={() => onSend(message)}
            className="h-[30px] rounded-[8px] bg-white/9 px-[8px] text-[clamp(10px,0.7vw,12px)] font-bold text-white/84 transition hover:-translate-y-[1px] hover:bg-white/16"
          >
            {message}
          </button>
        ))}
      </div>
    </section>
  )
}
