'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Home, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { readMatchResult, readMatchSnapshot, type MatchEndedResult } from '@/services/match'
import { normalizeAvatarSrc } from '@/utils/avatar'

interface ResultPlayer {
  id?: number
  name: string
  avatar: string
  score: number
  isWinner: boolean
}

function readPlayerId(result: MatchEndedResult) {
  const value = result.user_id ?? result.userId
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function readPlayerScore(result: MatchEndedResult) {
  const value = result.total_score ?? result.totalScore ?? result.score
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function readWinnerId(winner?: string | number) {
  const numberValue = typeof winner === 'number' ? winner : Number(winner)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

export default function MatchResultPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params?.matchId as string
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    const mountedTimer = window.setTimeout(() => setHasMounted(true), 0)

    return () => window.clearTimeout(mountedTimer)
  }, [])

  const matchResult = useMemo(() => (hasMounted ? readMatchResult(matchId) : null), [hasMounted, matchId])

  const resultPlayers = useMemo<ResultPlayer[]>(() => {
    const snapshotPlayers = readMatchSnapshot(matchId)?.players ?? []
    const winnerId = readWinnerId(matchResult?.winner)

    return (matchResult?.results ?? []).map((result, index) => {
      const playerId = readPlayerId(result)
      const snapshotPlayer = snapshotPlayers.find((player) => player.user_id === playerId)

      return {
        id: playerId,
        name: result.nickname ?? result.name ?? snapshotPlayer?.nickname ?? `玩家 ${index + 1}`,
        avatar: normalizeAvatarSrc(snapshotPlayer?.avatar) || '/images/login/default-avatar.png',
        score: readPlayerScore(result),
        isWinner: winnerId !== undefined && playerId === winnerId,
      }
    })
  }, [matchId, matchResult])

  const sortedPlayers = useMemo(
    () => [...resultPlayers].sort((left, right) => right.score - left.score),
    [resultPlayers],
  )
  const winner = sortedPlayers.find((player) => player.isWinner) ?? sortedPlayers[0]

  return (
    <main className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-[#060318] px-6 py-10 text-white">
      <Image src="/images/battle-vs-bg.png" alt="" fill priority className="object-cover opacity-90" />
      <div className="absolute inset-0 bg-[#050416]/46" />

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-[720px] overflow-hidden rounded-[18px] border border-blue-200/28 bg-[#0b1b78]/72 p-6 shadow-[0_0_38px_rgba(76,118,255,0.28),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md"
      >
        <div className="pointer-events-none absolute -inset-[1px] rounded-[18px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,208,74,0.24),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_32%)]" />

        <div className="relative text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#FFD04A]/40 bg-[#FFD04A]/18 shadow-[0_0_24px_rgba(255,208,74,0.28)]">
            <Trophy className="h-8 w-8 text-[#FFD04A]" />
          </div>
          <h1 className="text-[30px] font-black tracking-[0.06em] text-white [text-shadow:0_0_16px_rgba(94,124,255,0.74)]">
            对局结束
          </h1>
          <p className="mt-2 text-[14px] font-bold text-blue-100/72">
            {winner ? `胜者：${winner.name}` : '等待结算数据'}
          </p>
        </div>

        <div className="relative mt-7 space-y-3">
          {sortedPlayers.length > 0 ? (
            sortedPlayers.map((player, index) => (
              <div
                key={`${player.id ?? player.name}-${index}`}
                className={`grid grid-cols-[48px_1fr_92px] items-center gap-3 rounded-xl border px-4 py-3 ${
                  player.isWinner
                    ? 'border-[#FFD04A]/44 bg-[#FFD04A]/16 shadow-[0_0_20px_rgba(255,208,74,0.16)]'
                    : 'border-white/12 bg-white/8'
                }`}
              >
                <div className="text-center text-[18px] font-black text-[#FFD04A]">#{index + 1}</div>
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src={player.avatar}
                    alt={player.name}
                    width={42}
                    height={42}
                    className="h-[42px] w-[42px] rounded-full border border-white/20 object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-black text-white">{player.name}</div>
                    {player.isWinner && <div className="text-[12px] font-bold text-[#FFD04A]">本局胜者</div>}
                  </div>
                </div>
                <div className="text-right text-[22px] font-black text-white">{player.score}</div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-white/12 bg-white/8 px-4 py-8 text-center text-[14px] font-bold text-white/66">
              暂无结算数据
            </div>
          )}
        </div>

        <div className="relative mt-7 flex justify-center">
          <button
            type="button"
            onClick={() => router.push('/lobby')}
            className="flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-blue-300/28 bg-[linear-gradient(180deg,rgba(40,70,180,0.88),rgba(15,22,93,0.9))] px-6 py-3 text-[15px] font-black text-white shadow-[0_12px_28px_rgba(4,7,38,0.28),inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:brightness-110"
          >
            <Home className="h-4 w-4" />
            返回大厅
          </button>
        </div>
      </motion.section>
    </main>
  )
}
