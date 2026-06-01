import { createApiClient } from './api'
import { type RoomUserInfo } from './room'

const matchClient = createApiClient()

export const MATCH_SNAPSHOT_STORAGE_PREFIX = 'galax_match_snapshot:'

export interface StartMatchRequest {
  match_id: string | number
}

export interface MatchInfoPlayer extends RoomUserInfo {
  user_id: number
  nickname: string
}

export interface StartMatchResponse {
  match_id: string | number
  room_id?: string | number
  match_info: MatchInfoPlayer[]
}

export interface MatchSnapshot {
  matchId: string | number
  roomId: string | number
  players: MatchInfoPlayer[]
  currentRound: number
  currentTurnUserId?: number
  currentSeatNo?: number
  phase: string
  remainThrowCount: number
  diceValues: number[]
  lockedDice: boolean[]
  selectableScores: string[]
}

export interface MatchStateResponse {
  match_id: string | number
  room_id: string | number
  current_round: number
  current_turn_user_id: number
  current_seat_no: number
  phase: string
  remain_throw_count: number
  dice_values: number[]
  locked_dice: boolean[]
  selectable_scores: string[]
}

export interface RollDiceRequest {
  match_id: string | number
  user_id: number
  lock_mask: number[]
}

export interface RollDiceResponse {
  dice_values: number[]
  remain_throw_count: number
  lock_mask?: number[]
  selectable_scores?: string[]
}

interface ApiEnvelope<T> {
  code: number
  msg?: string
  data: T
}

function unwrapApiData<T>(response: T | ApiEnvelope<T>) {
  if (response && typeof response === 'object' && 'code' in response && 'data' in response) {
    const envelope = response as ApiEnvelope<T>
    if (envelope.code !== 0 && envelope.code !== 200) {
      throw new Error(envelope.msg || '请求失败')
    }

    return envelope.data
  }

  return response as T
}

export function getMatchSnapshotStorageKey(matchId: string | number) {
  return `${MATCH_SNAPSHOT_STORAGE_PREFIX}${matchId}`
}

function createMatchSnapshot(match: StartMatchResponse, roomId?: string | number): MatchSnapshot {
  const firstPlayer = match.match_info[0]

  return {
    matchId: match.match_id,
    roomId: roomId ?? match.room_id ?? '',
    players: match.match_info,
    currentRound: 1,
    currentTurnUserId: firstPlayer?.user_id,
    currentSeatNo: firstPlayer?.seat_no,
    phase: 'waiting',
    remainThrowCount: 3,
    diceValues: [1, 1, 1, 1, 1],
    lockedDice: [false, false, false, false, false],
    selectableScores: [],
  }
}

export function createMatchSnapshotFromState(
  state: MatchStateResponse,
  players: MatchInfoPlayer[] = [],
): MatchSnapshot {
  return {
    matchId: state.match_id,
    roomId: state.room_id,
    players,
    currentRound: state.current_round,
    currentTurnUserId: state.current_turn_user_id,
    currentSeatNo: state.current_seat_no,
    phase: state.phase,
    remainThrowCount: state.remain_throw_count,
    diceValues: state.dice_values,
    lockedDice: state.locked_dice,
    selectableScores: state.selectable_scores,
  }
}

export function storeMatchSnapshot(match: StartMatchResponse, roomId?: string | number) {
  if (typeof window === 'undefined') return

  window.sessionStorage.setItem(getMatchSnapshotStorageKey(match.match_id), JSON.stringify(createMatchSnapshot(match, roomId)))
}

export function readMatchSnapshot(matchId: string | number) {
  if (typeof window === 'undefined' || !matchId) return null

  const storedSnapshot = window.sessionStorage.getItem(getMatchSnapshotStorageKey(matchId))
  if (!storedSnapshot) return null

  try {
    const snapshot = JSON.parse(storedSnapshot) as MatchSnapshot | StartMatchResponse

    if ('matchId' in snapshot) return snapshot

    return createMatchSnapshot(snapshot)
  } catch {
    window.sessionStorage.removeItem(getMatchSnapshotStorageKey(matchId))
    return null
  }
}

export async function startMatch(payload: StartMatchRequest) {
  const { data } = await matchClient.post<StartMatchResponse | ApiEnvelope<StartMatchResponse>>('/api/match/start', payload)
  return unwrapApiData(data)
}

export async function getMatchState(matchId: string | number) {
  const { data } = await matchClient.get<MatchStateResponse | ApiEnvelope<MatchStateResponse>>('/api/match/state', {
    params: {
      match_id: matchId,
    },
  })
  return unwrapApiData(data)
}

export async function rollDice(payload: RollDiceRequest) {
  const { data } = await matchClient.post<RollDiceResponse | ApiEnvelope<RollDiceResponse>>('/api/match/roll_dice', payload)
  return unwrapApiData(data)
}
