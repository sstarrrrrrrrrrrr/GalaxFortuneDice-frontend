import type { SelectableScore } from '@/services/match'

// 计分面板中某个可选分数项的预览数据。
export interface ScorePreview {
  key: string
  score?: number
}

// 已选择分数项记录，包含本轮分和累计分。
export interface SelectedScore {
  roundScore: number
  totalScore: number
}

// 把某个玩家的选分结果写入 selectedScores 结构。
export function applySelectedScore(
  currentScores: Record<number, Record<string, SelectedScore>>,
  {
    userId,
    scoreKey,
    roundScore,
    totalScore,
  }: {
    userId: number
    scoreKey: string
    roundScore: number
    totalScore?: number
  },
) {
  return {
    ...currentScores,
    [userId]: {
      ...currentScores[userId],
      [scoreKey]: {
        roundScore,
        totalScore: totalScore ?? currentScores[userId]?.[scoreKey]?.totalScore ?? 0,
      },
    },
  }
}

// 开发环境输出后端 selectable_scores，便于排查字段兼容。
export function debugSelectableScores(selectableScores: unknown) {
  if (process.env.NODE_ENV !== 'development') return

  const keys = Array.isArray(selectableScores)
    ? selectableScores.map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          return record.key ?? record.score_key ?? record.category ?? record.name ?? record.type
        }

        return item
      })
    : selectableScores && typeof selectableScores === 'object'
      ? Object.keys(selectableScores)
      : []

  console.log('[match selectable_scores]', {
    raw: selectableScores,
    valueType: Array.isArray(selectableScores) ? 'array' : typeof selectableScores,
    keys,
  })
}

// 统一前后端分数项 key，供 UI 计分表使用。
export function normalizeScoreKey(key: string) {
  const normalizedKey = key.trim()
  const keyMap: Record<string, string> = {
    ones: 'ones',
    twos: 'twos',
    threes: 'threes',
    fours: 'fours',
    fives: 'fives',
    sixes: 'sixes',
    three_of_a_kind: 'threeKind',
    threeKind: 'threeKind',
    four_of_a_kind: 'fourKind',
    fourKind: 'fourKind',
    full_house: 'fullHouse',
    fullHouse: 'fullHouse',
    small_straight: 'smallStr',
    smallStraight: 'smallStr',
    smallStr: 'smallStr',
    large_straight: 'largeStr',
    largeStraight: 'largeStr',
    largeStr: 'largeStr',
    chance: 'chance',
    yahtzee: 'yahtzee',
  }

  return keyMap[normalizedKey] ?? normalizedKey
}

// 将 UI 分数项 key 转回后端 score_type。
export function toBackendScoreType(key: string) {
  const scoreTypeMap: Record<string, string> = {
    threeKind: 'three_of_a_kind',
    fourKind: 'four_of_a_kind',
    fullHouse: 'full_house',
    smallStr: 'small_straight',
    largeStr: 'large_straight',
  }

  return scoreTypeMap[key] ?? key
}

// 从后端兼容格式中读取可选分数项 key。
function readSelectableScoreKey(score: SelectableScore) {
  if (typeof score === 'string') return score

  return (
    score.key ??
    score.score_key ??
    score.category ??
    score.name ??
    score.type
  )
}

// 从后端兼容格式中读取可选分数值。
function readSelectableScoreValue(score: SelectableScore) {
  if (typeof score === 'string') return undefined

  const value = score.score ?? score.value ?? score.points ?? score.score_value
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

// 构建计分面板按 key 访问的可选分数 Map。
export function buildSelectableScoreMap(selectableScores: SelectableScore[]) {
  return selectableScores.reduce<Record<string, ScorePreview>>((scoreMap, score) => {
    const key = readSelectableScoreKey(score)
    if (!key) return scoreMap

    const normalizedKey = normalizeScoreKey(key)

    return {
      ...scoreMap,
      [normalizedKey]: {
        key: normalizedKey,
        score: readSelectableScoreValue(score),
      },
    }
  }, {})
}

// 自动选分时，从可选分数中找未选择的最高分项。
export function findHighestSelectableScoreKey(
  selectableScores: SelectableScore[],
  selectedScoreMap: Record<string, SelectedScore> = {},
) {
  return selectableScores.reduce<{ key: string; score: number } | null>((highestScore, score) => {
    const key = readSelectableScoreKey(score)
    const scoreValue = readSelectableScoreValue(score)
    if (!key || scoreValue === undefined) return highestScore

    const normalizedKey = normalizeScoreKey(key)
    if (selectedScoreMap[normalizedKey]) return highestScore

    if (!highestScore || scoreValue > highestScore.score) {
      return { key: normalizedKey, score: scoreValue }
    }

    return highestScore
  }, null)?.key
}
