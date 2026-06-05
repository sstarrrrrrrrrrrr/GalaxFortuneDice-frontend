import type { GameDie as Die } from '../components/GamePanels'
import type { MatchSnapshot, SelectableScore } from '@/services/match'

const DICE_COUNT = 5

// 把后端锁定骰子数据规整为固定 5 位的 0/1 mask。
export function normalizeLockMask(mask?: Array<number | boolean>) {
  return Array.from({ length: DICE_COUNT }, (_, index) => (mask?.[index] ? 1 : 0))
}

// 将后端对局状态里的骰子值同步到当前骰子 UI 状态。
export function syncDiceWithMatchState({
  currentDice,
  diceValues,
  lockedDice,
  syncLockedDice,
}: {
  currentDice: Die[]
  diceValues: number[]
  lockedDice: boolean[]
  syncLockedDice: boolean
}) {
  return currentDice.map((die, index) => ({
    ...die,
    value: diceValues[index] ?? die.value,
    held: syncLockedDice ? Boolean(lockedDice[index]) : die.held,
  }))
}

// 将一次投掷结果合并进当前 MatchSnapshot。
export function applyRollToMatchSnapshot(
  currentSnapshot: MatchSnapshot | null,
  {
    diceValues,
    lockMask,
    remainThrowCount,
    selectableScores,
  }: {
    diceValues?: number[]
    lockMask: number[]
    remainThrowCount?: number
    selectableScores?: SelectableScore[]
  },
) {
  if (!currentSnapshot) return currentSnapshot

  return {
    ...currentSnapshot,
    diceValues: diceValues ?? currentSnapshot.diceValues,
    lockedDice: lockMask.map(Boolean),
    remainThrowCount: remainThrowCount ?? currentSnapshot.remainThrowCount,
    selectableScores: selectableScores ?? currentSnapshot.selectableScores,
  }
}
