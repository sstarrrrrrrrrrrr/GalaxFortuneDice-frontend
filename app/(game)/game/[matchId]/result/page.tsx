'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useClientMounted } from '@/hooks/useClientMounted'
import { getFinalScores, readMatchResult, readMatchSnapshot, storeMatchResult, type MatchEndedSnapshot } from '@/services/match'
import { normalizeAvatarSrc } from '@/utils/avatar'
import { ResultView, type ResultPlayer } from './components/ResultView'
import { createCeremonySlots, readIsWinner, readPlayerId, readPlayerRank, readPlayerScore, readStoredRoomCreatorId, readWinnerId } from './utils/result'

type ModeKey = 'solo-2p' | 'solo-3p' | 'solo-4p' | 'team-2v2' | 'team-3v3' | 'team-5v5'

const modeConfig: Record<ModeKey, { name: string; detail: string; maxPlayers: number }> = {
  'solo-2p': { name: '单人混战模式', detail: '2人混战 · 鲜血沙滩', maxPlayers: 2 },
  'solo-3p': { name: '单人混战模式', detail: '3人混战 · 鲜血沙滩', maxPlayers: 3 },
  'solo-4p': { name: '单人混战模式', detail: '4人混战 · 鲜血沙滩', maxPlayers: 4 },
  'team-2v2': { name: '组队竞技模式', detail: '2V2 组队 · 鲜血沙滩', maxPlayers: 4 },
  'team-3v3': { name: '组队竞技模式', detail: '3V3 组队 · 鲜血沙滩', maxPlayers: 6 },
  'team-5v5': { name: '组队竞技模式', detail: '5V5 组队 · 鲜血沙滩', maxPlayers: 10 },
}

// 从路由参数中解析结算页模式，异常值回退到 2 人混战。
function getModeKey(value: string | null): ModeKey {
  return value && value in modeConfig ? (value as ModeKey) : 'solo-2p'
}

// 结算页容器，读取本地快照和最终分数接口，并组织领奖台展示数据。
export default function MatchResultPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const matchId = params?.matchId as string
  const modeKey = getModeKey(searchParams.get('mode'))
  const roleParam = searchParams.get('role')
  const mode = modeConfig[modeKey]
  const hasMounted = useClientMounted()
  const [matchSnapshot, setMatchSnapshot] = useState<ReturnType<typeof readMatchSnapshot>>(null)
  const [matchResult, setMatchResult] = useState<MatchEndedSnapshot | null>(null)

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

    // 后端最终分数可能晚于跳转到达，这里短轮询补齐结算数据。
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
          avatar: normalizeAvatarSrc(snapshotPlayer?.avatar),
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

  // 返回房间时保留模式、身份和人数参数，确保后续流程仍能识别玩法。
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
    <ResultView
      modeName={mode.name}
      modeDetail={mode.detail}
      ceremonySlots={ceremonySlots}
      onBackRoom={goToRoom}
      onReplay={goToRoom}
      onBackLobby={() => router.push('/lobby')}
    />
  )
}
