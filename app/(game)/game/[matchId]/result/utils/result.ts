import type { MatchEndedResult } from '@/services/match'
import { getRoomSnapshotStorageKey, type RoomInfo } from '@/services/room'
import type { ResultPlayer, ResultPlayerSlot } from '../components/ResultView'

// 从后端结算结果中读取玩家 id。
export function readPlayerId(result: MatchEndedResult) {
  const value = result.user_id ?? result.userId ?? result.player_id ?? result.playerId
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

// 从后端结算结果中读取玩家最终展示分数。
export function readPlayerScore(result: MatchEndedResult) {
  const value = result.total_score ?? result.totalScore ?? result.score ?? result.round_score ?? result.roundScore
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

// 从后端结算结果中读取排名。
export function readPlayerRank(result: MatchEndedResult) {
  const numberValue = typeof result.rank === 'number' ? result.rank : Number(result.rank)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

// 从后端结算结果中读取是否胜利。
export function readIsWinner(result: MatchEndedResult) {
  const value = result.is_win ?? result.isWin

  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'

  return false
}

// 将 winner 字段转换为可比较的玩家 id。
export function readWinnerId(winner?: string | number) {
  const numberValue = typeof winner === 'number' ? winner : Number(winner)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

// 根据玩家数量决定领奖台展示顺序。
function getCeremonyRankOrder(playerCount: number) {
  if (playerCount === 2) return [1, 2]
  if (playerCount === 3) return [2, 1, 3]
  return [2, 1, 3, 4]
}

// 根据排名结果生成领奖台槽位。
export function createCeremonySlots(players: ResultPlayer[], playerCount: number): ResultPlayerSlot[] {
  return getCeremonyRankOrder(playerCount).reduce<ResultPlayerSlot[]>((slots, rank) => {
    const player = players.find((item) => item.rank === rank)
    return player ? [...slots, { rank, player }] : slots
  }, [])
}

// 从房间快照缓存中读取房主 id，用于返回房间时保留 creatorId。
export function readStoredRoomCreatorId(roomId?: string | number) {
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
