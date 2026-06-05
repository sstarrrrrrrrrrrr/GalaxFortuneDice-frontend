import type { MatchEndedResult, MatchInfoPlayer, SelectableScore } from '@/services/match'

export type MatchStartedMessage = {
  type?: string
  match_id?: string | number
  room_id?: string | number
  players?: MatchInfoPlayer[]
  first_player_id?: number
  game_mode?: number
}

export type DiceRolledMessage = {
  type?: string
  user_id?: number
  dice_values?: number[]
  lock_mask?: number[]
  data?: unknown
  payload?: unknown
  remain_throws?: number
  remain_throw_count?: number
  selectable_scores?: SelectableScore[]
}

export type ScoreSelectedMessage = {
  type?: string
  user_id?: number
  score_type?: string
  score_key?: string
  round_score?: number
  total_score?: number
  data?: unknown
  payload?: unknown
}

export type GameEndedMessage = {
  type?: string
  results?: MatchEndedResult[]
  player_scores?: MatchEndedResult[]
  winner?: string | number
  winner_user_id?: string | number
  data?: unknown
  payload?: unknown
}

// 判断 WebSocket 原始事件类型是否属于选分同步事件。
export function isScoreSelectedEvent(rawType?: string) {
  return [
    'score_selected',
    'select_score',
    'score_chosen',
    'score_updated',
    'score_scored',
  ].includes(rawType ?? '')
}

// 将未知值安全转换成对象记录，便于兼容不同后端消息结构。
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

// 从多个候选对象里读取数字数组字段。
function readNumberArray(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue

    for (const key of keys) {
      const value = record[key]
      if (Array.isArray(value)) {
        const numbers = value
          .map((item) => (typeof item === 'number' ? item : typeof item === 'boolean' ? Number(item) : Number(item)))
          .filter((item) => Number.isFinite(item))

        if (numbers.length > 0) return numbers
      }
    }
  }

  return undefined
}

// 从多个候选对象里读取 selectable_scores 数组。
function readSelectableScoreArray(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue

    for (const key of keys) {
      const value = record[key]
      if (Array.isArray(value)) {
        return value as SelectableScore[]
      }
    }
  }

  return undefined
}

// 从多个候选对象里读取最终结算结果数组。
function readResultArray(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue

    for (const key of keys) {
      const value = record[key]
      if (Array.isArray(value)) {
        return value as MatchEndedResult[]
      }
    }
  }

  return []
}

// 从多个候选对象里读取数字字段。
function readNumberValue(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue

    for (const key of keys) {
      const value = record[key]
      const numberValue = typeof value === 'number' ? value : Number(value)
      if (Number.isFinite(numberValue)) return numberValue
    }
  }

  return undefined
}

// 从多个候选对象里读取字符串字段。
function readStringValue(records: Array<Record<string, unknown> | null>, keys: string[]) {
  for (const record of records) {
    if (!record) continue

    for (const key of keys) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value
    }
  }

  return undefined
}

// 解析 dice_rolled 消息，提取骰子、锁定、剩余投掷和可选分数。
export function readDiceRolledPayload(message: DiceRolledMessage) {
  const data = asRecord(message.data)
  const payload = asRecord(message.payload)
  const dataPayload = asRecord(data?.payload)
  const records = [message as Record<string, unknown>, data, payload, dataPayload]

  return {
    diceValues: readNumberArray(records, ['dice_values', 'diceValues']),
    lockMask: readNumberArray(records, ['lock_mask', 'lockMask', 'locked_dice', 'lockedDice']),
    remainThrowCount: readNumberValue(records, ['remain_throws', 'remainThrows', 'remain_throw_count', 'remainThrowCount']),
    selectableScores: readSelectableScoreArray(records, ['selectable_scores', 'selectableScores']),
  }
}

// 解析选分同步消息，提取玩家、分数项和分数。
export function readScoreSelectedPayload(message: ScoreSelectedMessage) {
  const data = asRecord(message.data)
  const payload = asRecord(message.payload)
  const dataPayload = asRecord(data?.payload)
  const records = [message as Record<string, unknown>, data, payload, dataPayload]

  return {
    userId: readNumberValue(records, ['user_id', 'userId']),
    scoreKey: readStringValue(records, ['score_type', 'scoreType', 'score_key', 'scoreKey', 'category', 'type']),
    roundScore: readNumberValue(records, ['round_score', 'roundScore', 'score', 'score_value', 'scoreValue']),
    totalScore: readNumberValue(records, ['total_score', 'totalScore']),
  }
}

// 解析游戏结束消息，提取结算结果和赢家。
export function readGameEndedPayload(message: GameEndedMessage) {
  const data = asRecord(message.data)
  const payload = asRecord(message.payload)
  const dataPayload = asRecord(data?.payload)
  const records = [message as Record<string, unknown>, data, payload, dataPayload]

  return {
    results: readResultArray(records, ['results', 'player_scores', 'playerScores']),
    winner: readNumberValue(records, ['winner', 'winner_user_id', 'winnerUserId']) ?? readStringValue(records, ['winner', 'winner_user_id', 'winnerUserId']),
  }
}

// 判断 WebSocket 原始事件类型是否表示游戏结束。
export function isGameEndedEvent(rawType?: string) {
  return rawType === 'game_ended'
}
