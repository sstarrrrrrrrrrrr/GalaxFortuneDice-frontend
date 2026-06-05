import type { MatchSnapshot, MatchStateResponse } from '@/services/match'
import type { MatchStartedMessage } from './matchEvents'

// 判断后端对局状态是否已经结束。
export function isMatchFinishedState(currentRound?: number, phase?: string) {
  const normalizedPhase = phase?.toLowerCase()

  return (
    (currentRound !== undefined && currentRound > 13) ||
    normalizedPhase === 'ended' ||
    normalizedPhase === 'finished' ||
    normalizedPhase === 'completed' ||
    normalizedPhase === 'game_over'
  )
}

// 根据后端剩余投掷次数判断当前回合是否已经投掷过。
export function hasRolledInMatchState(matchState: MatchStateResponse) {
  return matchState.remain_throw_count < 3
}

// 根据 match_started 消息构造或补全本地 MatchSnapshot。
export function buildStartedMatchSnapshot(
  currentSnapshot: MatchSnapshot | null,
  matchStartedMessage: MatchStartedMessage,
  matchId: string,
): MatchSnapshot {
  return {
    matchId: matchStartedMessage.match_id ?? currentSnapshot?.matchId ?? matchId,
    roomId: matchStartedMessage.room_id ?? currentSnapshot?.roomId ?? '',
    players: matchStartedMessage.players?.length ? matchStartedMessage.players : currentSnapshot?.players ?? [],
    currentRound: currentSnapshot?.currentRound ?? 1,
    currentTurnUserId: matchStartedMessage.first_player_id ?? currentSnapshot?.currentTurnUserId,
    currentSeatNo: currentSnapshot?.currentSeatNo,
    phase: 'started',
    remainThrowCount: currentSnapshot?.remainThrowCount ?? 3,
    diceValues: currentSnapshot?.diceValues ?? [1, 1, 1, 1, 1],
    lockedDice: currentSnapshot?.lockedDice ?? [false, false, false, false, false],
    selectableScores: currentSnapshot?.selectableScores ?? [],
  }
}
