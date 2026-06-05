'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useClientMounted } from '@/hooks/useClientMounted'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createMatchSnapshotFromState, getFinalScores, getMatchState, readMatchSnapshot, rollDice, selectScore, storeMatchResult, type MatchEndedResult, type MatchSnapshot, type SelectableScore } from '@/services/match'
import { connectMatchChannel } from '@/websocket/match'
import { DiceArea, GameSidePanel, GameTopStatus, RollActionBar, ScorePanel, type GameDie as Die, type GamePlayer as Player } from './components/GamePanels'
import {
  isGameEndedEvent,
  isScoreSelectedEvent,
  readDiceRolledPayload,
  readGameEndedPayload,
  readScoreSelectedPayload,
  type DiceRolledMessage,
  type GameEndedMessage,
  type MatchStartedMessage,
  type ScoreSelectedMessage,
} from './utils/matchEvents'
import { applyRollToMatchSnapshot, normalizeLockMask, syncDiceWithMatchState } from './utils/dice'
import { buildStartedMatchSnapshot, hasRolledInMatchState, isMatchFinishedState } from './utils/matchState'
import {
  applySelectedScore,
  buildSelectableScoreMap,
  debugSelectableScores,
  findHighestSelectableScoreKey,
  normalizeScoreKey,
  toBackendScoreType,
  type SelectedScore,
} from './utils/score'
import { clearIntervalRef, clearMatchTimers, clearRollStartTimers, clearTimeoutRef, clearTurnTimers, startAutoRollHintTimer } from './utils/timers'
import { buildDisplayPlayers, findCurrentPlayer, getVisiblePlayers, isCurrentPlayerTurn } from './utils/players'
import { buildFallbackMatchResults } from './utils/results'

type ModeKey = 'solo-2p' | 'solo-3p' | 'solo-4p' | 'team-2v2' | 'team-3v3' | 'team-5v5'


const TURN_SECONDS = 15
const ROLL_DURATION = 3000
const TOTAL_ROUNDS = 13
const DICE_ROLL_FRAMES = ['z_1.png', 'z-2.png', 'z-3.png', 'z-4.png', 'z-5.png', 'z-6.png']
const DICE_ROLL_FRAME_INTERVAL = 70

const initialDice: Die[] = [
  { id: 0, value: 1, held: false },
  { id: 1, value: 1, held: false },
  { id: 2, value: 1, held: false },
  { id: 3, value: 1, held: false },
  { id: 4, value: 1, held: false },
]

const modeConfig: Record<ModeKey, { name: string; maxPlayers: number; teamMode?: boolean }> = {
  'solo-2p': { name: '2人混战', maxPlayers: 2 },
  'solo-3p': { name: '3人混战', maxPlayers: 3 },
  'solo-4p': { name: '4人混战', maxPlayers: 4 },
  'team-2v2': { name: '2V2 组队', maxPlayers: 4, teamMode: true },
  'team-3v3': { name: '3V3 组队', maxPlayers: 6, teamMode: true },
  'team-5v5': { name: '5V5 组队', maxPlayers: 10, teamMode: true },
}

const players: Player[] = [
  {
    id: 1,
    name: '银河旅行者',
    avatar: '/images/login/default-avatar.png',
    score: 2450,
    isHost: true,
    isCurrentTurn: true,
    team: 'blue',
  },
  {
    id: 2,
    name: '星河漫步',
    avatar: '/images/login/default-avatar.png',
    score: 1820,
    team: 'red',
  },
  {
    id: 3,
    name: '小熊软糖',
    avatar: '/images/login/default-avatar.png',
    score: 1680,
    team: 'blue',
  },
  {
    id: 4,
    name: '像素船长',
    avatar: '/images/login/default-avatar.png',
    score: 1510,
    team: 'red',
  },
]

// 对局页容器，管理投掷、锁骰、选分、倒计时和 match WebSocket 同步。
export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const matchId = params?.matchId as string
  const hasMounted = useClientMounted()
  const hydratedUser = hasMounted ? currentUser : null
  const requestedMode = searchParams.get('mode')
  const modeKey: ModeKey = requestedMode && requestedMode in modeConfig ? (requestedMode as ModeKey) : 'solo-2p'
  const roleParam = searchParams.get('role')
  const resultRoute = `/game/${matchId}/result?mode=${modeKey}${roleParam ? `&role=${encodeURIComponent(roleParam)}` : ''}`
  const mode = modeConfig[modeKey]
  const [matchSnapshot, setMatchSnapshot] = useState<MatchSnapshot | null>(null)
  const [dice, setDice] = useState(initialDice)
  const [lockMask, setLockMask] = useState(() => normalizeLockMask())
  const [rollingDiceMask, setRollingDiceMask] = useState(() => normalizeLockMask())
  const [rollsLeft, setRollsLeft] = useState(3)
  const [isRolling, setIsRolling] = useState(false)
  const [rollingFrame, setRollingFrame] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedScores, setSelectedScores] = useState<Record<number, Record<string, SelectedScore>>>({})
  const [totalScores, setTotalScores] = useState<Record<number, number>>({})
  const [selectingScoreKey, setSelectingScoreKey] = useState<string | null>(null)
  const [hasRolledThisTurn, setHasRolledThisTurn] = useState(false)
  const [autoRollHintSeconds, setAutoRollHintSeconds] = useState(TURN_SECONDS)
  const [isGameEnded, setIsGameEnded] = useState(false)
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteRollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoRollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoRollHintTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const gameEndedRef = useRef(false)
  const isRollingRef = useRef(isRolling)
  const selectedScoresRef = useRef(selectedScores)
  const selectingScoreKeyRef = useRef(selectingScoreKey)
  const matchSnapshotRef = useRef(matchSnapshot)
  const hasSubmittedScoreThisTurnRef = useRef(false)
  const hasAutoRolledOpeningRef = useRef(false)
  const openingTurnUserIdRef = useRef<number | undefined>(undefined)
  const displayPlayers = useMemo(
    () => buildDisplayPlayers(matchSnapshot, players, hydratedUser),
    [hydratedUser, matchSnapshot],
  )
  const currentPlayer = findCurrentPlayer(displayPlayers)
  const currentUserId = hydratedUser?.id
  const isCurrentUserTurn = isCurrentPlayerTurn(currentUserId, currentPlayer)
  const currentUserIdRef = useRef(currentUserId)
  const hasRolledThisTurnRef = useRef(hasRolledThisTurn)

  const visiblePlayers = useMemo(() => getVisiblePlayers(displayPlayers, mode.maxPlayers), [displayPlayers, mode.maxPlayers])
  const selectableScoreMap = useMemo(
    () => buildSelectableScoreMap(matchSnapshot?.selectableScores ?? []),
    [matchSnapshot?.selectableScores],
  )

  // 结束对局：清理所有定时器，读取最终分数并跳转结算页。
  const finishMatch = useCallback(
    (fallback: { results?: MatchEndedResult[]; winner?: string | number } = {}) => {
      if (gameEndedRef.current) return

      gameEndedRef.current = true
      setIsGameEnded(true)

      clearMatchTimers({
        rollTimerRef,
        remoteRollTimerRef,
        autoRollTimerRef,
        autoRollHintTimerRef,
        countdownTimerRef,
      })
      isRollingRef.current = false
      setIsRolling(false)
      setTimeLeft(0)

      const fallbackResults = buildFallbackMatchResults({
        fallbackResults: fallback.results,
        matchSnapshot: matchSnapshotRef.current,
        totalScores,
        selectedScores: selectedScoresRef.current,
      })

      void getFinalScores(matchId)
        .then((finalScores) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[match final_score data]', finalScores)
          }
          storeMatchResult({
            matchId,
            results: finalScores.length > 0 ? finalScores : fallbackResults,
            winner: fallback.winner,
            endedAt: Date.now(),
          })
          router.replace(resultRoute)
        })
        .catch((error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[match final_score error]', error)
          }

          storeMatchResult({
            matchId,
            results: fallbackResults,
            winner: fallback.winner,
            endedAt: Date.now(),
          })
          router.replace(resultRoute)
        })
    },
    [matchId, resultRoute, router, totalScores],
  )

  // 从后端刷新对局状态，并同步骰子、剩余投掷次数和可选分数。
  const refreshMatchState = useCallback(
    async ({ syncLockedDice = true }: { syncLockedDice?: boolean } = {}) => {
      if (gameEndedRef.current) return

      const matchState = await getMatchState(matchId)
      debugSelectableScores(matchState.selectable_scores)

      if (isMatchFinishedState(matchState.current_round, matchState.phase)) {
        finishMatch()
        return matchState
      }

      setMatchSnapshot((currentSnapshot) =>
        createMatchSnapshotFromState(matchState, currentSnapshot?.players ?? []),
      )
      setRollsLeft(matchState.remain_throw_count)
      const nextHasRolledThisTurn = hasRolledInMatchState(matchState)
      hasRolledThisTurnRef.current = nextHasRolledThisTurn
      setHasRolledThisTurn(nextHasRolledThisTurn)
      if (!isRollingRef.current) {
        setDice((currentDice) =>
          syncDiceWithMatchState({
            currentDice,
            diceValues: matchState.dice_values,
            lockedDice: matchState.locked_dice,
            syncLockedDice,
          }),
        )
      }

      if (syncLockedDice && !isRollingRef.current) {
        setLockMask(normalizeLockMask(matchState.locked_dice))
      }
      if (!isRollingRef.current) {
        setRollingDiceMask(normalizeLockMask())
      }

      return matchState
    },
    [finishMatch, matchId],
  )

  // 投掷动画结束后刷新状态，避免动画期间的后端状态覆盖本地骰子动效。
  const refreshMatchStateAfterRoll = useCallback(
    () => {
      if (gameEndedRef.current) return

      void refreshMatchState().catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[match state error]', error)
        }
      })
    },
    [refreshMatchState],
  )

  // 提交当前玩家选分，并防止同一回合重复提交。
  const submitScoreSelection = useCallback(
    async (scoreKey: string) => {
      if (isGameEnded || !isCurrentUserTurn || !currentUserId || selectingScoreKeyRef.current || hasSubmittedScoreThisTurnRef.current) return

      clearIntervalRef(countdownTimerRef)
      setTimeLeft(0)
      selectingScoreKeyRef.current = scoreKey
      setSelectingScoreKey(scoreKey)

      try {
        const selectResult = await selectScore({
          match_id: matchId,
          user_id: currentUserId,
          score_type: toBackendScoreType(scoreKey),
        })

        setSelectedScores((currentScores) => {
          const nextScores = applySelectedScore(currentScores, {
            userId: currentUserId,
            scoreKey,
            roundScore: selectResult.round_score,
            totalScore: selectResult.total_score,
          })
          selectedScoresRef.current = nextScores
          return nextScores
        })
        hasSubmittedScoreThisTurnRef.current = true
        setTotalScores((currentScores) => ({
          ...currentScores,
          [currentUserId]: selectResult.total_score,
        }))
        await refreshMatchState()
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[select score error]', error)
        }
      } finally {
        selectingScoreKeyRef.current = null
        setSelectingScoreKey(null)
      }
    },
    [currentUserId, isCurrentUserTurn, isGameEnded, matchId, refreshMatchState],
  )

  // 倒计时结束且未选分时，自动选择当前可选分数中的最高项。
  const autoSelectHighestScore = useCallback(
    async (selectableScores?: SelectableScore[]) => {
      if (hasSubmittedScoreThisTurnRef.current || !currentUserId) return

      let nextSelectableScores = selectableScores

      if (!nextSelectableScores?.length) {
        const latestMatchState = await refreshMatchState()
        nextSelectableScores = latestMatchState?.selectable_scores
      }

      const autoScoreKey = findHighestSelectableScoreKey(
        nextSelectableScores ?? [],
        selectedScoresRef.current[currentUserId],
      )

      if (autoScoreKey) {
        await submitScoreSelection(autoScoreKey)
      }
    },
    [currentUserId, refreshMatchState, submitScoreSelection],
  )

  useEffect(() => {
    selectedScoresRef.current = selectedScores
  }, [selectedScores])

  useEffect(() => {
    isRollingRef.current = isRolling
  }, [isRolling])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    hasRolledThisTurnRef.current = hasRolledThisTurn
  }, [hasRolledThisTurn])

  useEffect(() => {
    matchSnapshotRef.current = matchSnapshot

    if (!openingTurnUserIdRef.current && matchSnapshot?.currentTurnUserId) {
      openingTurnUserIdRef.current = matchSnapshot.currentTurnUserId
    }
  }, [matchSnapshot])

  useEffect(() => {
    hasSubmittedScoreThisTurnRef.current = false
    hasRolledThisTurnRef.current = false
    clearTurnTimers({
      countdownTimerRef,
      autoRollTimerRef,
      autoRollHintTimerRef,
    })
    const resetRolledTimer = window.setTimeout(() => {
      setTimeLeft(0)
      setAutoRollHintSeconds(TURN_SECONDS)
      setHasRolledThisTurn(false)
    }, 0)

    return () => window.clearTimeout(resetRolledTimer)
  }, [matchSnapshot?.currentTurnUserId])

  useEffect(() => {
    selectingScoreKeyRef.current = selectingScoreKey
  }, [selectingScoreKey])

  useEffect(() => {
    if (!hasMounted || !matchId) return

    const snapshotTimer = window.setTimeout(() => {
      setMatchSnapshot(readMatchSnapshot(matchId))
    }, 0)

    return () => window.clearTimeout(snapshotTimer)
  }, [hasMounted, matchId])

  // 切换骰子锁定状态，并刷新后端状态但保留本地锁定展示。
  const toggleHold = useCallback(
    (id: number) => {
      if (isGameEnded || !isCurrentUserTurn || isRolling) return
      setLockMask((currentMask) => normalizeLockMask(currentMask).map((locked, index) => (index === id ? (locked ? 0 : 1) : locked)))
      setDice((prev) => prev.map((die) => (die.id === id ? { ...die, held: !die.held } : die)))
      void refreshMatchState({ syncLockedDice: false }).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[match state error]', error)
        }
      })
    },
    [isCurrentUserTurn, isGameEnded, isRolling, refreshMatchState],
  )

  // 执行投掷请求，并在动画时长结束后应用后端返回的正式骰子结果。
  const handleRoll = useCallback(async () => {
    if (isGameEnded || !isCurrentUserTurn || !currentUserId || isRollingRef.current || rollsLeft <= 0) return

    setRollingFrame(0)
    const currentLockMask = normalizeLockMask(lockMask)
    setRollingDiceMask(currentLockMask.map((locked) => (locked ? 0 : 1)))
    isRollingRef.current = true
    setIsRolling(true)
    setTimeLeft(0)

    clearRollStartTimers({
      rollTimerRef,
      countdownTimerRef,
      autoRollTimerRef,
      autoRollHintTimerRef,
    })

    try {
      const rollResult = await rollDice({
        match_id: matchId,
        user_id: currentUserId,
        lock_mask: currentLockMask,
      })

      rollTimerRef.current = setTimeout(() => {
        const nextLockMask = normalizeLockMask(rollResult.lock_mask ?? currentLockMask)
        setDice((currentDice) =>
          currentDice.map((die, index) => ({
            ...die,
            value: rollResult.dice_values[index] ?? die.value,
            held: Boolean(nextLockMask[index]),
          })),
        )
        setLockMask(nextLockMask)
        setRollingDiceMask(normalizeLockMask())
        setRollsLeft(rollResult.remain_throw_count)
        setMatchSnapshot((currentSnapshot) =>
          applyRollToMatchSnapshot(currentSnapshot, {
            diceValues: rollResult.dice_values,
            lockMask: nextLockMask,
            remainThrowCount: rollResult.remain_throw_count,
            selectableScores: rollResult.selectable_scores,
          }),
        )
        isRollingRef.current = false
        hasRolledThisTurnRef.current = true
        setHasRolledThisTurn(true)
        setIsRolling(false)
        setTimeLeft(TURN_SECONDS)
        refreshMatchStateAfterRoll()
      }, ROLL_DURATION)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[roll dice error]', error)
      }
      setRollingDiceMask(normalizeLockMask())
      isRollingRef.current = false
      setIsRolling(false)
      setTimeLeft(0)
    }
  }, [currentUserId, isCurrentUserTurn, isGameEnded, lockMask, matchId, refreshMatchStateAfterRoll, rollsLeft])

  // 计分表点击入口，统一委托给选分提交流程。
  const handleSelectScore = useCallback(
    async (scoreKey: string) => {
      await submitScoreSelection(scoreKey)
    },
    [submitScoreSelection],
  )

  // 订阅 match WebSocket，接收远端投掷、选分、开局和结束事件。
  useEffect(() => {
    if (!hasMounted || !matchId) return

    return connectMatchChannel({
      matchId,
      onMessage: ({ rawType, message }) => {
        if (!message) return

        if (isGameEndedEvent(rawType)) {
          const gameEndedPayload = readGameEndedPayload(message as GameEndedMessage)
          finishMatch(gameEndedPayload)
          return
        }

        if (gameEndedRef.current) return

        if (rawType === 'dice_rolled') {
          const diceRolledMessage = message as DiceRolledMessage
          const diceRolledPayload = readDiceRolledPayload(diceRolledMessage)
          const nextDiceValues = diceRolledPayload.diceValues
          const nextLockMask = normalizeLockMask(diceRolledPayload.lockMask)
          const nextRemainThrowCount = diceRolledPayload.remainThrowCount
          const rolledUserId = diceRolledMessage.user_id

          if (isRollingRef.current && rolledUserId && rolledUserId === currentUserIdRef.current) {
            return
          }

          clearTimeoutRef(remoteRollTimerRef)
          setRollingFrame(0)
          setLockMask(nextLockMask)
          setDice((currentDice) =>
            currentDice.map((die, index) => ({
              ...die,
              held: Boolean(nextLockMask[index]),
            })),
          )
          const nextRollingDiceMask = nextLockMask.map((locked) => (locked ? 0 : 1))
          setRollingDiceMask(nextRollingDiceMask)
          isRollingRef.current = true
          setIsRolling(true)
          setTimeLeft(0)

          if (nextDiceValues?.length) {
            remoteRollTimerRef.current = setTimeout(() => {
              setDice((currentDice) =>
                currentDice.map((die, index) => ({
                  ...die,
                  value: nextRollingDiceMask[index] === 1 ? nextDiceValues[index] ?? die.value : die.value,
                  held: Boolean(nextLockMask[index]),
                })),
              )
              setRollingDiceMask(normalizeLockMask())
              isRollingRef.current = false
              hasRolledThisTurnRef.current = true
              setHasRolledThisTurn(true)
              setIsRolling(false)
              if (nextRemainThrowCount !== undefined) {
                setRollsLeft(nextRemainThrowCount)
              }
              setMatchSnapshot((currentSnapshot) =>
                applyRollToMatchSnapshot(currentSnapshot, {
                  diceValues: nextDiceValues,
                  lockMask: nextLockMask,
                  remainThrowCount: nextRemainThrowCount,
                  selectableScores: diceRolledPayload.selectableScores,
                }),
              )
              refreshMatchStateAfterRoll()
            }, ROLL_DURATION)
          } else {
            setRollingDiceMask(normalizeLockMask())
            isRollingRef.current = false
            hasRolledThisTurnRef.current = true
            setHasRolledThisTurn(true)
            setIsRolling(false)
            refreshMatchStateAfterRoll()
            if (nextRemainThrowCount !== undefined) {
              setRollsLeft(nextRemainThrowCount)
            }
            setMatchSnapshot((currentSnapshot) =>
              applyRollToMatchSnapshot(currentSnapshot, {
                diceValues: nextDiceValues,
                lockMask: nextLockMask,
                remainThrowCount: nextRemainThrowCount,
                selectableScores: diceRolledPayload.selectableScores,
              }),
            )
          }
          return
        }

        if (isScoreSelectedEvent(rawType)) {
          const scoreSelectedPayload = readScoreSelectedPayload(message as ScoreSelectedMessage)
          const selectedUserId = scoreSelectedPayload.userId
          const selectedScoreKey = scoreSelectedPayload.scoreKey ? normalizeScoreKey(scoreSelectedPayload.scoreKey) : undefined
          const selectedRoundScore = scoreSelectedPayload.roundScore
          const selectedTotalScore = scoreSelectedPayload.totalScore

          if (selectedUserId && selectedScoreKey && selectedRoundScore !== undefined) {
            setSelectedScores((currentScores) => {
              const nextScores = applySelectedScore(currentScores, {
                userId: selectedUserId,
                scoreKey: selectedScoreKey,
                roundScore: selectedRoundScore,
                totalScore: selectedTotalScore,
              })
              selectedScoresRef.current = nextScores
              return nextScores
            })
          }

          if (selectedUserId && selectedTotalScore !== undefined) {
            setTotalScores((currentScores) => ({
              ...currentScores,
              [selectedUserId]: selectedTotalScore,
            }))
          }

          void refreshMatchState().catch((error) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('[match state error]', error)
            }
          })
          return
        }

        if (rawType !== 'match_started') return

        const matchStartedMessage = message as MatchStartedMessage
        setMatchSnapshot((currentSnapshot) => buildStartedMatchSnapshot(currentSnapshot, matchStartedMessage, matchId))
      },
    })
  }, [finishMatch, hasMounted, matchId, refreshMatchState, refreshMatchStateAfterRoll])

  useEffect(() => {
    if (!hasMounted || !matchId) return

    let disposed = false

    // 首次进入对局页时拉取最新对局状态，补齐从 VS 页跳转后的初始数据。
    async function loadMatchState() {
      try {
        await refreshMatchState()
        if (disposed) return
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[match state error]', error)
        }
      }
    }

    void loadMatchState()

    return () => {
      disposed = true
    }
  }, [hasMounted, matchId, refreshMatchState])

  // 首个回合轮到当前用户时自动投掷一次，保证开局不会停在空骰子状态。
  useEffect(() => {
    if (
      !matchSnapshot ||
      isGameEnded ||
      !isCurrentUserTurn ||
      !currentUserId ||
      isRolling ||
      matchSnapshot.currentTurnUserId !== openingTurnUserIdRef.current ||
      matchSnapshot.currentRound !== 1 ||
      rollsLeft !== 3
    ) {
      return
    }

    if (hasAutoRolledOpeningRef.current) return

    hasAutoRolledOpeningRef.current = true
    void handleRoll()
  }, [currentUserId, handleRoll, isCurrentUserTurn, isGameEnded, isRolling, matchId, matchSnapshot, rollsLeft])

  // 当前回合没人操作时启动自动投掷提示和自动投掷定时器。
  useEffect(() => {
    if (
      isGameEnded ||
      !matchSnapshot?.currentTurnUserId ||
      hasRolledThisTurn ||
      isRolling ||
      rollsLeft <= 0
    ) {
      return
    }

    clearTimeoutRef(autoRollTimerRef)

    const stopAutoRollHintTimer = startAutoRollHintTimer({
      autoRollHintTimerRef,
      turnSeconds: TURN_SECONDS,
      setAutoRollHintSeconds,
    })

    autoRollTimerRef.current = setTimeout(() => {
      autoRollTimerRef.current = null
      clearIntervalRef(autoRollHintTimerRef)
      if (isCurrentUserTurn && !hasRolledThisTurnRef.current && !isRollingRef.current && rollsLeft > 0) {
        void handleRoll()
      }
    }, TURN_SECONDS * 1000)

    return () => {
      stopAutoRollHintTimer()
      clearTimeoutRef(autoRollTimerRef)
    }
  }, [handleRoll, hasRolledThisTurn, isCurrentUserTurn, isGameEnded, isRolling, matchSnapshot?.currentTurnUserId, rollsLeft])

  // 已经投掷后开启选分阶段倒计时。
  useEffect(() => {
    if (!hasRolledThisTurn) return

    const resetTimer = window.setTimeout(() => setTimeLeft(TURN_SECONDS), 0)

    return () => window.clearTimeout(resetTimer)
  }, [hasRolledThisTurn, matchId, matchSnapshot?.currentRound, matchSnapshot?.currentTurnUserId, rollsLeft])

  // 选分倒计时结束时，根据剩余投掷次数自动投掷或自动选最高分。
  useEffect(() => {
    if (isGameEnded || !matchSnapshot?.currentTurnUserId || !hasRolledThisTurn || isRolling) return

    clearIntervalRef(countdownTimerRef)

    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearIntervalRef(countdownTimerRef)
          if (isCurrentUserTurn) {
            if (rollsLeft > 0) {
              handleRoll()
            } else if (hasRolledThisTurnRef.current) {
              void autoSelectHighestScore(matchSnapshotRef.current?.selectableScores)
            }
          }
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => {
      clearIntervalRef(countdownTimerRef)
    }
  }, [autoSelectHighestScore, handleRoll, hasRolledThisTurn, isCurrentUserTurn, isGameEnded, isRolling, matchSnapshot?.currentTurnUserId, rollsLeft])

  // 投掷动画期间循环切换骰子帧。
  useEffect(() => {
    if (!isRolling) return

    const frameTimer = window.setInterval(() => {
      setRollingFrame((current) => (current + 1) % DICE_ROLL_FRAMES.length)
    }, DICE_ROLL_FRAME_INTERVAL)

    return () => window.clearInterval(frameTimer)
  }, [isRolling])

  // 页面卸载时清理所有对局定时器，避免离开页面后继续更新状态。
  useEffect(() => {
    return () => {
      clearMatchTimers({
        rollTimerRef,
        remoteRollTimerRef,
        autoRollTimerRef,
        autoRollHintTimerRef,
        countdownTimerRef,
      })
    }
  }, [])

  const showAutoRollHint = isCurrentUserTurn && !hasRolledThisTurn && !isRolling && rollsLeft > 0

  if (!hasMounted || !matchSnapshot) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#060318] text-white">
        <Image src="/images/battle-vs-bg.png" alt="" fill className="object-cover opacity-70" priority />
        <div className="absolute inset-0 bg-[#060318]/42" />
        <div className="relative rounded-2xl border border-blue-300/24 bg-blue-950/52 px-8 py-5 text-[16px] font-black tracking-[0.04em] shadow-[0_0_28px_rgba(76,118,255,0.24)] backdrop-blur-md">
          正在同步对局...
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen select-none overflow-hidden">
      <Image src="/images/battle-vs-bg.png" alt="" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-[#060318]/30" />

      <GameTopStatus
        currentRound={matchSnapshot.currentRound ?? 1}
        totalRounds={TOTAL_ROUNDS}
        timeLeft={timeLeft}
        isRolling={isRolling}
        rollsLeft={rollsLeft}
      />

      <GameSidePanel players={visiblePlayers} teamMode={Boolean(mode.teamMode)} />

      <DiceArea
        currentPlayerName={currentPlayer.name}
        dice={dice}
        rollingDiceMask={rollingDiceMask}
        rollingFrame={rollingFrame}
        isRolling={isRolling}
        rollsLeft={rollsLeft}
        diceRollFrames={DICE_ROLL_FRAMES}
        onToggleHold={toggleHold}
      />

      <ScorePanel
        selectableScoreMap={selectableScoreMap}
        scorePlayers={visiblePlayers}
        currentUserId={currentUserId}
        currentTurnUserId={matchSnapshot.currentTurnUserId}
        selectedScores={selectedScores}
        totalScores={totalScores}
        selectingScoreKey={selectingScoreKey}
        onSelectScore={handleSelectScore}
      />

      <RollActionBar
        visible={isCurrentUserTurn}
        showAutoRollHint={showAutoRollHint}
        autoRollHintSeconds={autoRollHintSeconds}
        isRolling={isRolling}
        rollsLeft={rollsLeft}
        onRoll={handleRoll}
      />
    </div>
  )
}
