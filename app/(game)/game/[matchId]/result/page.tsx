'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Crown, Home, RotateCcw, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { getFinalScores, readMatchResult, readMatchSnapshot, storeMatchResult, type MatchEndedResult, type MatchEndedSnapshot } from '@/services/match'
import { getRoomSnapshotStorageKey, type RoomInfo } from '@/services/room'
import { normalizeAvatarSrc } from '@/utils/avatar'

type ModeKey = 'solo-2p' | 'solo-3p' | 'solo-4p' | 'team-2v2' | 'team-3v3' | 'team-5v5'

interface ResultPlayer {
  id?: number
  name: string
  avatar: string
  score: number
  rank: number
  isWinner: boolean
}

interface RankTone {
  label: string
  ring: string
  border: string
  glow: string
  badge: string
  accent: string
}

interface ResultPlayerSlot {
  rank: number
  player?: ResultPlayer
}

const modeConfig: Record<ModeKey, { name: string; detail: string; maxPlayers: number }> = {
  'solo-2p': { name: '单人混战模式', detail: '2人混战 · 鲜血沙滩', maxPlayers: 2 },
  'solo-3p': { name: '单人混战模式', detail: '3人混战 · 鲜血沙滩', maxPlayers: 3 },
  'solo-4p': { name: '单人混战模式', detail: '4人混战 · 鲜血沙滩', maxPlayers: 4 },
  'team-2v2': { name: '组队竞技模式', detail: '2V2 组队 · 鲜血沙滩', maxPlayers: 4 },
  'team-3v3': { name: '组队竞技模式', detail: '3V3 组队 · 鲜血沙滩', maxPlayers: 6 },
  'team-5v5': { name: '组队竞技模式', detail: '5V5 组队 · 鲜血沙滩', maxPlayers: 10 },
}

const rankTones: Record<number, RankTone> = {
  1: {
    label: '第一名',
    ring: 'border-[#ffe28a] shadow-[0_0_28px_rgba(255,211,86,0.36)]',
    border: 'border-[#ffd866]/72 bg-[linear-gradient(180deg,rgba(95,65,18,0.76),rgba(20,16,50,0.84))]',
    glow: 'shadow-[0_24px_54px_rgba(4,6,30,0.48),0_0_34px_rgba(255,205,72,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]',
    badge: 'border-[#ffe28a]/58 bg-[#ffd45c]/20 text-[#ffe9a7]',
    accent: 'text-[#ffe28a]',
  },
  2: {
    label: '第二名',
    ring: 'border-[#7fc8ff] shadow-[0_0_22px_rgba(92,183,255,0.28)]',
    border: 'border-[#6fbfff]/44 bg-[linear-gradient(180deg,rgba(16,72,139,0.62),rgba(13,18,72,0.78))]',
    glow: 'shadow-[0_20px_44px_rgba(4,6,30,0.42),0_0_24px_rgba(72,151,255,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]',
    badge: 'border-[#7fc8ff]/44 bg-[#4aa3ff]/14 text-[#bde6ff]',
    accent: 'text-[#8bd2ff]',
  },
  3: {
    label: '第三名',
    ring: 'border-[#ffb06b] shadow-[0_0_20px_rgba(255,142,66,0.24)]',
    border: 'border-[#ffab68]/42 bg-[linear-gradient(180deg,rgba(116,55,19,0.58),rgba(30,18,62,0.78))]',
    glow: 'shadow-[0_20px_44px_rgba(4,6,30,0.4),0_0_22px_rgba(255,136,54,0.16),inset_0_1px_0_rgba(255,255,255,0.13)]',
    badge: 'border-[#ffb06b]/42 bg-[#ff934d]/14 text-[#ffd2a8]',
    accent: 'text-[#ffbd82]',
  },
  4: {
    label: '第四名',
    ring: 'border-[#b799ff] shadow-[0_0_20px_rgba(157,109,255,0.24)]',
    border: 'border-[#a88cff]/40 bg-[linear-gradient(180deg,rgba(74,45,137,0.58),rgba(20,16,64,0.78))]',
    glow: 'shadow-[0_20px_44px_rgba(4,6,30,0.4),0_0_22px_rgba(144,94,255,0.16),inset_0_1px_0_rgba(255,255,255,0.13)]',
    badge: 'border-[#b799ff]/40 bg-[#8b61ff]/14 text-[#d9ccff]',
    accent: 'text-[#c7b3ff]',
  },
}

function readPlayerId(result: MatchEndedResult) {
  const value = result.user_id ?? result.userId ?? result.player_id ?? result.playerId
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function readPlayerScore(result: MatchEndedResult) {
  const value = result.total_score ?? result.totalScore ?? result.score ?? result.round_score ?? result.roundScore
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function readPlayerRank(result: MatchEndedResult) {
  const numberValue = typeof result.rank === 'number' ? result.rank : Number(result.rank)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

function readIsWinner(result: MatchEndedResult) {
  const value = result.is_win ?? result.isWin

  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'

  return false
}

function readWinnerId(winner?: string | number) {
  const numberValue = typeof winner === 'number' ? winner : Number(winner)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function getModeKey(value: string | null): ModeKey {
  return value && value in modeConfig ? (value as ModeKey) : 'solo-2p'
}

function getCeremonyRankOrder(playerCount: number) {
  if (playerCount === 2) return [1, 2]
  if (playerCount === 3) return [2, 1, 3]
  return [2, 1, 3, 4]
}

function createCeremonySlots(players: ResultPlayer[], playerCount: number): ResultPlayerSlot[] {
  return getCeremonyRankOrder(playerCount).reduce<ResultPlayerSlot[]>((slots, rank) => {
    const player = players.find((item) => item.rank === rank)
    return player ? [...slots, { rank, player }] : slots
  }, [])
}

function formatScore(score: number) {
  return new Intl.NumberFormat('zh-CN').format(score)
}

function readStoredRoomCreatorId(roomId?: string | number) {
  if (typeof window === 'undefined' || !roomId) return undefined

  const storedSnapshot = window.sessionStorage.getItem(getRoomSnapshotStorageKey(roomId))
  if (!storedSnapshot) return undefined

  try {
    const roomSnapshot = JSON.parse(storedSnapshot) as RoomInfo
    return roomSnapshot.creator_id ?? roomSnapshot.owner_id
  } catch {
    return undefined
  }
}

export default function MatchResultPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const matchId = params?.matchId as string
  const modeKey = getModeKey(searchParams.get('mode'))
  const roleParam = searchParams.get('role')
  const mode = modeConfig[modeKey]
  const [hasMounted, setHasMounted] = useState(false)
  const [matchSnapshot, setMatchSnapshot] = useState<ReturnType<typeof readMatchSnapshot>>(null)
  const [matchResult, setMatchResult] = useState<MatchEndedSnapshot | null>(null)

  useEffect(() => {
    const mountedTimer = window.setTimeout(() => setHasMounted(true), 0)

    return () => window.clearTimeout(mountedTimer)
  }, [])

  useEffect(() => {
    if (!hasMounted || !matchId) return

    const resultTimer = window.setTimeout(() => {
      setMatchSnapshot(readMatchSnapshot(matchId))
      setMatchResult(readMatchResult(matchId))
    }, 0)

    return () => window.clearTimeout(resultTimer)
  }, [hasMounted, matchId])

  useEffect(() => {
    if (!hasMounted || !matchId) return

    let disposed = false
    let attempts = 0

    async function loadFinalScores() {
      attempts += 1

      try {
        const finalScores = await getFinalScores(matchId)
        if (disposed) return

        if (process.env.NODE_ENV === 'development') {
          console.log('[result final_score data]', finalScores)
        }

        const nextResult: MatchEndedSnapshot = {
          matchId,
          results: finalScores,
          winner: readMatchResult(matchId)?.winner,
          endedAt: Date.now(),
        }
        if (finalScores.length > 0) {
          storeMatchResult(nextResult)
          setMatchResult(nextResult)
          return
        }

        if (attempts < 5) {
          window.setTimeout(loadFinalScores, 800)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[result final_score error]', error)
        }

        if (!disposed && attempts < 5) {
          window.setTimeout(loadFinalScores, 800)
        }
      }
    }

    void loadFinalScores()

    return () => {
      disposed = true
    }
  }, [hasMounted, matchId])

  const rankedPlayers = useMemo<ResultPlayer[]>(() => {
    const snapshotPlayers = matchSnapshot?.players ?? []
    const winnerId = readWinnerId(matchResult?.winner)

    return (matchResult?.results ?? [])
      .map((result, index) => {
        const playerId = readPlayerId(result)
        const snapshotPlayer = snapshotPlayers.find((player) => player.user_id === playerId)

        return {
          id: playerId,
          name: result.nickname ?? result.name ?? snapshotPlayer?.nickname ?? `玩家 ${index + 1}`,
          avatar: normalizeAvatarSrc(snapshotPlayer?.avatar) || '/images/login/default-avatar.png',
          score: readPlayerScore(result),
          rank: readPlayerRank(result) ?? Number.MAX_SAFE_INTEGER,
          isWinner: readIsWinner(result) || (winnerId !== undefined && playerId === winnerId),
        }
      })
      .sort((left, right) => left.rank - right.rank || right.score - left.score)
      .map((player, index, sortedPlayers) => ({
        ...player,
        rank: player.rank === Number.MAX_SAFE_INTEGER ? index + 1 : player.rank,
        isWinner: player.isWinner || (winnerId === undefined && index === 0) || sortedPlayers.length === 1,
      }))
      .slice(0, Math.min(mode.maxPlayers, 4))
  }, [matchResult, matchSnapshot, mode.maxPlayers])

  const ceremonyPlayerCount = Math.min(mode.maxPlayers, 4)
  const ceremonySlots = useMemo(
    () => createCeremonySlots(rankedPlayers, ceremonyPlayerCount),
    [ceremonyPlayerCount, rankedPlayers],
  )
  const roomId = matchSnapshot?.roomId
  const roomCreatorId = hasMounted ? readStoredRoomCreatorId(roomId) : undefined

  function goToRoom() {
    if (!roomId) {
      router.push('/lobby')
      return
    }

    const roomQuery = new URLSearchParams({
      mode: modeKey,
      role: roleParam === 'host' ? 'host' : 'player',
      maxPlayers: String(mode.maxPlayers),
    })

    if (roomCreatorId) {
      roomQuery.set('creatorId', String(roomCreatorId))
    }

    router.push(`/room/${encodeURIComponent(String(roomId))}?${roomQuery.toString()}`)
  }

  return (
    <main className="relative h-screen min-h-[720px] w-screen min-w-[1180px] overflow-hidden bg-[#050416] text-white">
      <Image src="/images/JS_bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,28,0.3),rgba(5,4,22,0.58)_58%,rgba(5,4,20,0.76))]" />
      <div className="absolute inset-x-[18%] top-[25%] h-[48%] bg-[#050416]/18 blur-[58px]" />
      <div className="pointer-events-none absolute left-[4%] top-[18%] h-[62%] w-[18%] border-l border-[#6f8fff]/22 bg-[linear-gradient(90deg,rgba(64,96,255,0.18),transparent)] opacity-80 shadow-[-18px_0_44px_rgba(74,104,255,0.16)]" />
      <div className="pointer-events-none absolute right-[4%] top-[18%] h-[62%] w-[18%] border-r border-[#ffe28a]/18 bg-[linear-gradient(270deg,rgba(255,210,92,0.14),transparent)] opacity-80 shadow-[18px_0_44px_rgba(255,205,72,0.12)]" />
      <div className="pointer-events-none absolute bottom-[9.5%] left-1/2 h-px w-[78%] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(116,148,255,0.42),rgba(255,222,122,0.34),rgba(116,148,255,0.42),transparent)]" />
      <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-[12%] w-[64%] -translate-x-1/2 rounded-[50%] border border-[#7c8fff]/18 shadow-[0_0_38px_rgba(76,104,255,0.16)]" />

      <section className="relative z-10 flex h-full flex-col items-center px-[4vw] pb-[3vh] pt-[2.4vh]">
        <ResultHeader modeName={mode.name} modeDetail={mode.detail} />

        <div className="flex min-h-0 w-full flex-1 items-center justify-center pt-[1vh]">
          {ceremonySlots.length > 0 ? (
            <div
              className="relative grid w-full max-w-[1160px] items-center justify-center gap-[clamp(52px,6vw,118px)]"
              style={{ gridTemplateColumns: `repeat(${ceremonySlots.length}, minmax(0, auto))` }}
            >
              {ceremonySlots.map((slot, index) => (
                <ResultPlayerCard
                  key={`rank-${slot.rank}`}
                  slot={slot}
                  delay={slot.rank === 1 ? 0.28 : 0.38 + index * 0.08}
                  direction={index < ceremonySlots.findIndex((item) => item.rank === 1) ? -1 : 1}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="rounded-[16px] border border-white/14 bg-[#081052]/64 px-12 py-10 text-center text-[18px] font-black text-white/70 shadow-[0_24px_48px_rgba(2,5,30,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[12px]"
            >
              暂无结算数据
            </motion.div>
          )}
        </div>

        <ResultActions onBackRoom={goToRoom} onReplay={goToRoom} onBackLobby={() => router.push('/lobby')} />
      </section>
    </main>
  )
}

function ResultHeader({ modeName, modeDetail }: { modeName: string; modeDetail: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        className="mx-auto flex h-[214px] min-w-[680px] items-center justify-center px-8"
      >
        <Image
          src="/images/victory.png"
          alt="胜利"
          width={1280}
          height={640}
          priority
          className="h-full w-auto object-contain drop-shadow-[0_0_34px_rgba(255,214,91,0.52)]"
        />
      </motion.div>
      <p className="mt-[0.6vh] text-[clamp(18px,1.45vw,26px)] font-black tracking-[0.12em] text-white">
        {modeName}
      </p>
      <p className="mt-[0.45vh] text-[clamp(13px,1vw,18px)] font-bold tracking-[0.08em] text-[#b8c9ff]/82">
        {modeDetail}
      </p>
    </motion.header>
  )
}

function ResultPlayerCard({
  slot,
  delay,
  direction,
}: {
  slot: ResultPlayerSlot
  delay: number
  direction: -1 | 1
}) {
  const player = slot.player
  const isChampion = slot.rank === 1
  const tone = rankTones[slot.rank] ?? rankTones[4]

  return (
    <motion.article
      initial={{ opacity: 0, x: isChampion ? 0 : direction * 96, scale: isChampion ? 0.84 : 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      whileHover={{ y: -8, scale: isChampion ? 1.045 : 1.035 }}
      whileFocus={{ y: -8, scale: isChampion ? 1.045 : 1.035 }}
      transition={{ delay, duration: isChampion ? 0.68 : 0.58, ease: [0.2, 0.9, 0.2, 1] }}
      tabIndex={0}
      className={`relative flex shrink-0 flex-col items-center overflow-hidden rounded-[20px] border text-center backdrop-blur-[14px] ${
        isChampion ? 'h-[390px] w-[286px] px-6 py-7' : 'h-[334px] w-[242px] px-5 py-6'
      } ${tone.border} ${tone.glow} cursor-default outline-none transition-[box-shadow,filter] duration-200 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#ffe28a]/70`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(180deg,rgba(255,255,255,0.15),transparent)]" />
      <div className="pointer-events-none absolute inset-x-[14%] bottom-[-38px] h-[72px] rounded-full bg-white/8 blur-[28px]" />

      <div className="relative flex w-full items-center justify-between">
        <span className={`rounded-full border px-3 py-1 text-[13px] font-black ${tone.badge}`}>{tone.label}</span>
        {isChampion ? (
          <span className="flex items-center gap-1 rounded-full border border-[#ffe28a]/54 bg-[#ffd45c]/22 px-3 py-1 text-[12px] font-black text-[#ffe8a4]">
            <Crown className="h-3.5 w-3.5" />
            MVP
          </span>
        ) : (
          <span className={`rounded-full border px-3 py-1 text-[12px] font-black ${tone.badge}`}>
            #{slot.rank}
          </span>
        )}
      </div>

      <div
        className={`relative mt-7 overflow-hidden rounded-full border-[3px] bg-[#10135a] ${
          isChampion ? 'h-[112px] w-[112px]' : 'h-[92px] w-[92px]'
        } ${tone.ring}`}
      >
        {player ? (
          <Image src={player.avatar} alt={player.name} fill sizes={isChampion ? '112px' : '92px'} className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#11155d] text-[14px] font-black text-white/38">
            待定
          </div>
        )}
      </div>

      {isChampion && (
        <div className="absolute left-1/2 top-[70px] -translate-x-1/2 text-[#ffe28a] [filter:drop-shadow(0_0_12px_rgba(255,210,80,0.46))]">
          <Crown className="h-9 w-9" />
        </div>
      )}

      <h2
        className={`mt-5 flex h-[50px] w-full shrink-0 items-center justify-center truncate font-black leading-tight text-white ${
          isChampion ? 'text-[24px]' : 'text-[20px]'
        } [text-shadow:0_0_10px_rgba(118,139,255,0.5)]`}
      >
        {player?.name ?? '等待结算数据'}
      </h2>

      <div className="mt-auto w-full shrink-0 rounded-[14px] border border-white/12 bg-[#05093a]/46 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="text-[12px] font-bold tracking-[0.16em] text-white/50">最终得分</div>
        <div className={`mt-1 font-black ${isChampion ? 'text-[34px]' : 'text-[28px]'} ${tone.accent}`}>
          {player ? formatScore(player.score) : '--'}
        </div>
      </div>
    </motion.article>
  )
}

function ResultActions({
  onBackRoom,
  onReplay,
  onBackLobby,
}: {
  onBackRoom: () => void
  onReplay: () => void
  onBackLobby: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.78, duration: 0.45 }}
      className="mb-[1vh] flex items-center justify-center gap-5"
    >
      <button
        type="button"
        onClick={onBackRoom}
        className="flex h-[52px] min-w-[154px] items-center justify-center gap-2 rounded-[12px] border border-[#7da9ff]/34 bg-[linear-gradient(180deg,rgba(55,81,196,0.86),rgba(26,24,104,0.92))] px-6 text-[15px] font-black text-white shadow-[0_14px_28px_rgba(3,6,34,0.34),inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:-translate-y-[1px] hover:brightness-110"
      >
        <Shield className="h-4 w-4" />
        返回房间
      </button>
      <button
        type="button"
        onClick={onReplay}
        className="flex h-[62px] min-w-[184px] items-center justify-center gap-2 rounded-[14px] border border-[#fff0a3]/62 bg-[linear-gradient(180deg,#ffe378,#e7a829)] px-8 text-[18px] font-black text-[#2f1b06] shadow-[0_16px_34px_rgba(217,155,35,0.28),0_0_22px_rgba(255,216,92,0.26),inset_0_1px_0_rgba(255,255,255,0.42)] transition hover:-translate-y-[1px] hover:brightness-105"
      >
        <RotateCcw className="h-5 w-5" />
        再来一局
      </button>
      <button
        type="button"
        onClick={onBackLobby}
        className="flex h-[52px] min-w-[154px] items-center justify-center gap-2 rounded-[12px] border border-[#7da9ff]/34 bg-[linear-gradient(180deg,rgba(55,81,196,0.86),rgba(26,24,104,0.92))] px-6 text-[15px] font-black text-white shadow-[0_14px_28px_rgba(3,6,34,0.34),inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:-translate-y-[1px] hover:brightness-110"
      >
        <Home className="h-4 w-4" />
        返回大厅
      </button>
    </motion.div>
  )
}
