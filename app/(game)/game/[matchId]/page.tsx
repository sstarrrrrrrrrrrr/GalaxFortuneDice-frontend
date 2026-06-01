'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  Clock,
  Crown,
  Lock,
  MessageSquare,
  RotateCcw,
  Send,
  Settings,
  Smile,
  Trophy,
  Zap,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createMatchSnapshotFromState, getMatchState, readMatchSnapshot, rollDice, type MatchInfoPlayer, type MatchSnapshot } from '@/services/match'
import { normalizeAvatarSrc } from '@/utils/avatar'
import { connectMatchChannel } from '@/websocket/match'

type ModeKey = 'solo-2p' | 'solo-3p' | 'solo-4p' | 'team-2v2' | 'team-3v3' | 'team-5v5'

interface Die {
  id: number
  value: number
  held: boolean
}

type Player = {
  id: number
  name: string
  avatar: string
  score: number
  isHost?: boolean
  isCurrentTurn?: boolean
  team?: 'blue' | 'red'
}

type MatchStartedMessage = {
  type?: string
  match_id?: string | number
  room_id?: string | number
  players?: MatchInfoPlayer[]
  first_player_id?: number
  game_mode?: number
}

type DiceRolledMessage = {
  type?: string
  user_id?: number
  dice_values?: number[]
  lock_mask?: number[]
  remain_throws?: number
  remain_throw_count?: number
  selectable_scores?: string[]
}

const TURN_SECONDS = 15
const ROLL_DURATION = 3000
const TOTAL_ROUNDS = 13
const DICE_COUNT = 5
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

function normalizeMatchPlayer(player: MatchInfoPlayer, currentTurnUserId?: number): Player {
  return {
    id: player.user_id,
    name: player.nickname,
    avatar: normalizeAvatarSrc(player.avatar) || '/images/login/default-avatar.png',
    score: 0,
    isCurrentTurn: player.user_id === currentTurnUserId,
    team: player.team_id === 2 ? 'red' : 'blue',
  }
}

function readInitialMatchSnapshot(matchId: string) {
  return readMatchSnapshot(matchId)
}

function normalizeLockMask(mask?: Array<number | boolean>) {
  return Array.from({ length: DICE_COUNT }, (_, index) => (mask?.[index] ? 1 : 0))
}

const chatMessages = [
  { name: '银河旅行者', text: '这把先稳一点' },
  { name: '星河漫步', text: '收到，等你投骰' },
  { name: '小熊软糖', text: '留三个六！' },
  { name: '系统', text: '15 秒内未投掷将自动投掷' },
]

const scoreSections = [
  {
    title: '上层（数字组合）',
    rows: [
      { label: '一（1点）', key: 'ones' },
      { label: '二（2点）', key: 'twos' },
      { label: '三（3点）', key: 'threes' },
      { label: '四（4点）', key: 'fours' },
      { label: '五（5点）', key: 'fives' },
      { label: '六（6点）', key: 'sixes' },
      { label: '小计', key: 'upperSubtotal', strong: true },
      { label: '奖励（≥63分）★', key: 'bonus', accent: true },
    ],
  },
  {
    title: '下层（牌型组合）',
    rows: [
      { label: '三条相同', key: 'threeKind' },
      { label: '四条相同', key: 'fourKind' },
      { label: '葫芦', key: 'fullHouse' },
      { label: '小顺子（4连）', key: 'smallStr' },
      { label: '大顺子（5连）', key: 'largeStr' },
      { label: '任意牌（机会）', key: 'chance' },
      { label: '小计', key: 'lowerSubtotal', strong: true },
    ],
  },
  {
    title: '特殊奖励',
    rows: [{ label: '乐骰（YAHTZEE）', key: 'yahtzee', strong: true }],
  },
]

export default function GamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const matchId = params?.matchId as string
  const [hasMounted, setHasMounted] = useState(false)
  const hydratedUser = hasMounted ? currentUser : null
  const requestedMode = searchParams.get('mode')
  const modeKey: ModeKey = requestedMode && requestedMode in modeConfig ? (requestedMode as ModeKey) : 'solo-2p'
  const mode = modeConfig[modeKey]
  const [matchSnapshot, setMatchSnapshot] = useState<MatchSnapshot | null>(null)
  const [dice, setDice] = useState(initialDice)
  const [lockMask, setLockMask] = useState(() => normalizeLockMask())
  const [rollingDiceMask, setRollingDiceMask] = useState(() => normalizeLockMask())
  const [rollsLeft, setRollsLeft] = useState(3)
  const [isRolling, setIsRolling] = useState(false)
  const [rollingFrame, setRollingFrame] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS)
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteRollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const displayPlayers = useMemo(
    () => {
      if (matchSnapshot?.players.length) {
        return matchSnapshot.players.map((player) => normalizeMatchPlayer(player, matchSnapshot.currentTurnUserId))
      }

      return players.map((player) =>
        player.id === 1
          ? {
              ...player,
              name: hydratedUser?.nickname ?? player.name,
              avatar: hydratedUser?.avatar || player.avatar,
            }
          : player,
      )
    },
    [hydratedUser, matchSnapshot],
  )
  const currentPlayer = displayPlayers.find((player) => player.isCurrentTurn) ?? displayPlayers[0]
  const currentUserId = hydratedUser?.id
  const isCurrentUserTurn = Boolean(currentUserId && currentPlayer?.id === currentUserId)

  const visiblePlayers = useMemo(() => displayPlayers.slice(0, mode.maxPlayers), [displayPlayers, mode.maxPlayers])

  useEffect(() => {
    const mountedTimer = window.setTimeout(() => setHasMounted(true), 0)

    return () => window.clearTimeout(mountedTimer)
  }, [])

  useEffect(() => {
    if (!hasMounted || !matchId) return

    const snapshotTimer = window.setTimeout(() => {
      setMatchSnapshot(readInitialMatchSnapshot(matchId))
    }, 0)

    return () => window.clearTimeout(snapshotTimer)
  }, [hasMounted, matchId])

  const toggleHold = useCallback(
    (id: number) => {
      if (!isCurrentUserTurn || isRolling) return
      setLockMask((currentMask) => normalizeLockMask(currentMask).map((locked, index) => (index === id ? (locked ? 0 : 1) : locked)))
      setDice((prev) => prev.map((die) => (die.id === id ? { ...die, held: !die.held } : die)))
    },
    [isCurrentUserTurn, isRolling],
  )

  const handleRoll = useCallback(async () => {
    if (!isCurrentUserTurn || !currentUserId || isRolling || rollsLeft <= 0) return

    setRollingFrame(0)
    const currentLockMask = normalizeLockMask(lockMask)
    setRollingDiceMask(currentLockMask.map((locked) => (locked ? 0 : 1)))
    setIsRolling(true)
    setTimeLeft(TURN_SECONDS)

    if (rollTimerRef.current) clearTimeout(rollTimerRef.current)

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
          currentSnapshot
            ? {
                ...currentSnapshot,
                diceValues: rollResult.dice_values,
                lockedDice: nextLockMask.map(Boolean),
                remainThrowCount: rollResult.remain_throw_count,
                selectableScores: rollResult.selectable_scores ?? currentSnapshot.selectableScores,
              }
            : currentSnapshot,
        )
        setIsRolling(false)
        setTimeLeft(TURN_SECONDS)
      }, ROLL_DURATION)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[roll dice error]', error)
      }
      setRollingDiceMask(normalizeLockMask())
      setIsRolling(false)
      setTimeLeft(TURN_SECONDS)
    }
  }, [currentUserId, isCurrentUserTurn, isRolling, lockMask, matchId, rollsLeft])

  useEffect(() => {
    if (!hasMounted || !matchId) return

    return connectMatchChannel({
      matchId,
      onMessage: ({ rawType, message }) => {
        if (!message) return

        if (rawType === 'dice_rolled') {
          const diceRolledMessage = message as DiceRolledMessage
          const nextDiceValues = diceRolledMessage.dice_values
          const nextLockMask = normalizeLockMask(diceRolledMessage.lock_mask)
          const nextRemainThrowCount = diceRolledMessage.remain_throws ?? diceRolledMessage.remain_throw_count

          if (remoteRollTimerRef.current) clearTimeout(remoteRollTimerRef.current)
          setRollingFrame(0)
          setLockMask(nextLockMask)
          setDice((currentDice) =>
            currentDice.map((die, index) => ({
              ...die,
              held: Boolean(nextLockMask[index]),
            })),
          )
          setRollingDiceMask(nextLockMask.map((locked) => (locked ? 0 : 1)))
          setIsRolling(true)

          if (nextDiceValues?.length) {
            remoteRollTimerRef.current = setTimeout(() => {
              setDice((currentDice) =>
                currentDice.map((die, index) => ({
                  ...die,
                  value: nextDiceValues[index] ?? die.value,
                  held: Boolean(nextLockMask[index]),
                })),
              )
              setRollingDiceMask(normalizeLockMask())
              setIsRolling(false)
            }, ROLL_DURATION)
          } else {
            setRollingDiceMask(normalizeLockMask())
            setIsRolling(false)
          }
          if (nextRemainThrowCount !== undefined) {
            setRollsLeft(nextRemainThrowCount)
          }
          setMatchSnapshot((currentSnapshot) =>
            currentSnapshot
              ? {
                  ...currentSnapshot,
                  diceValues: nextDiceValues ?? currentSnapshot.diceValues,
                  lockedDice: nextLockMask.map(Boolean),
                  remainThrowCount: nextRemainThrowCount ?? currentSnapshot.remainThrowCount,
                  selectableScores: diceRolledMessage.selectable_scores ?? currentSnapshot.selectableScores,
                }
              : currentSnapshot,
          )
          return
        }

        if (rawType !== 'match_started') return

        const matchStartedMessage = message as MatchStartedMessage
        setMatchSnapshot((currentSnapshot) => ({
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
        }))
      },
    })
  }, [hasMounted, matchId])

  useEffect(() => {
    if (!hasMounted || !matchId) return

    let disposed = false

    async function loadMatchState() {
      try {
        const matchState = await getMatchState(matchId)
        if (disposed) return

        setMatchSnapshot((currentSnapshot) =>
          createMatchSnapshotFromState(matchState, currentSnapshot?.players ?? []),
        )
        setRollsLeft(matchState.remain_throw_count)
        setDice((currentDice) =>
          currentDice.map((die, index) => ({
            ...die,
            value: matchState.dice_values[index] ?? die.value,
            held: matchState.locked_dice[index] ?? die.held,
          })),
        )
        setLockMask(normalizeLockMask(matchState.locked_dice))
        setRollingDiceMask(normalizeLockMask())
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
  }, [hasMounted, matchId])

  useEffect(() => {
    if (!isCurrentUserTurn || isRolling || rollsLeft <= 0) return

    const countdownTimer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(countdownTimer)
          handleRoll()
          return TURN_SECONDS
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(countdownTimer)
  }, [handleRoll, isCurrentUserTurn, isRolling, rollsLeft])

  useEffect(() => {
    if (!isRolling) return

    const frameTimer = window.setInterval(() => {
      setRollingFrame((current) => (current + 1) % DICE_ROLL_FRAMES.length)
    }, DICE_ROLL_FRAME_INTERVAL)

    return () => window.clearInterval(frameTimer)
  }, [isRolling])

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current)
      if (remoteRollTimerRef.current) clearTimeout(remoteRollTimerRef.current)
    }
  }, [])

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

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute left-0 right-0 top-0 z-30 flex items-center justify-center pt-5"
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 rounded-2xl border border-blue-400/25 bg-blue-950/50 px-6 py-2.5 shadow-[0_0_20px_rgba(59,130,246,0.15)] backdrop-blur-md">
            <Zap className="h-5 w-5 text-blue-400" />
            <span className="text-[15px] font-bold text-white/90">回合</span>
            <span className="text-[20px] font-black text-[#8BB4FF] [text-shadow:0_0_10px_rgba(59,130,246,0.6)]">
              {matchSnapshot?.currentRound ?? 1} / {TOTAL_ROUNDS}
            </span>
          </div>

          <motion.div
            animate={{
              boxShadow: [
                '0 0 25px rgba(80,120,255,0.3), 0 0 50px rgba(120,80,255,0.15)',
                '0 0 40px rgba(80,120,255,0.5), 0 0 80px rgba(120,80,255,0.25)',
                '0 0 25px rgba(80,120,255,0.3), 0 0 50px rgba(120,80,255,0.15)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-blue-400/40 bg-gradient-to-br from-blue-900/60 to-purple-900/60 backdrop-blur-md"
          >
            <span className="text-[36px] font-black text-white [text-shadow:0_0_20px_rgba(100,150,255,0.8),0_0_40px_rgba(120,80,255,0.4)]">
              {timeLeft}
            </span>
          </motion.div>

          <div className="flex items-center gap-3 rounded-2xl border border-purple-400/25 bg-purple-950/50 px-6 py-2.5 shadow-[0_0_20px_rgba(139,92,246,0.15)] backdrop-blur-md">
            <Clock className="h-5 w-5 text-purple-400" />
            <span className="text-[15px] font-bold text-[#C4B5FD] [text-shadow:0_0_10px_rgba(139,92,246,0.5)]">
              {isRolling ? '投掷中...' : '准备阶段'}
            </span>
            <span className="ml-1 rounded-full border border-[#FFD04A]/30 bg-[#FFD04A]/20 px-2.5 py-0.5 text-[12px] font-bold text-[#FFD04A]">
              剩余 {rollsLeft} 次
            </span>
          </div>
        </div>
      </motion.div>

        <GameSidePanel players={visiblePlayers} teamMode={Boolean(mode.teamMode)} />

      <div className="absolute bottom-[90px] left-[270px] right-[350px] top-[110px] z-20 flex flex-col items-center justify-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-950/40 px-5 py-2 backdrop-blur-sm"
        >
          <div className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
          <span className="text-[14px] font-bold text-blue-300">{currentPlayer.name} 的回合</span>
          <ChevronRight className="h-4 w-4 text-blue-400/50" />
          <span className="text-[14px] font-bold text-[#FFD04A]">
            {isRolling ? '投掷中...' : '选择保留骰子'}
          </span>
        </motion.div>

        <div className="flex items-center gap-6">
          {dice.map((die, index) => (
            <motion.div
              key={die.id}
              initial={{ y: 30, opacity: 0, rotateY: -180 }}
              animate={{ y: 0, opacity: 1, rotateY: 0 }}
              transition={{ delay: 0.3 + index * 0.12, duration: 0.5, type: 'spring', stiffness: 200 }}
              onClick={() => toggleHold(die.id)}
              className="group cursor-pointer"
            >
              <motion.div
                animate={
                  isRolling && rollingDiceMask[index] === 1
                    ? {
                        boxShadow: '0 0 30px rgba(80,120,255,0.5), 0 8px 25px rgba(0,0,0,0.4)',
                      }
                    : {
                        y: die.held ? 0 : [0, -6, 0],
                        boxShadow: die.held
                          ? '0 0 25px rgba(255,208,74,0.4), 0 4px 15px rgba(0,0,0,0.3)'
                          : [
                              '0 0 20px rgba(80,120,255,0.3), 0 8px 25px rgba(0,0,0,0.4)',
                              '0 0 35px rgba(120,80,255,0.5), 0 12px 35px rgba(0,0,0,0.3)',
                              '0 0 20px rgba(80,120,255,0.3), 0 8px 25px rgba(0,0,0,0.4)',
                            ],
                      }
                }
                transition={
                  isRolling && rollingDiceMask[index] === 1
                    ? { duration: 0.3 }
                    : die.held
                      ? { duration: 0.3 }
                      : {
                          y: { duration: 2.5 + index * 0.3, repeat: Infinity, ease: 'easeInOut' },
                          boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                        }
                }
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={`relative h-[96px] w-[96px] overflow-hidden rounded-2xl backdrop-blur-sm transition-colors duration-300 ${
                  die.held
                    ? 'border-2 border-[#FFD04A]/50 bg-gradient-to-br from-[#2a2a5c]/90 via-[#3a3a7c]/80 to-[#2a2a5c]/90'
                    : 'border border-white/15 bg-gradient-to-br from-[#1a2a6c]/90 via-[#2a3a8c]/80 to-[#1a1a5c]/90'
                }`}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[40%] rounded-t-2xl bg-gradient-to-b from-white/[0.08] to-transparent" />
                <div
                  className={`pointer-events-none absolute inset-0 z-10 rounded-2xl ${
                    die.held
                      ? 'bg-gradient-to-br from-[#FFD04A]/15 via-transparent to-[#FFD04A]/5'
                      : 'bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/5'
                  }`}
                />

                <AnimatePresence>
                  {die.held && rollingDiceMask[index] !== 1 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-[#FFD04A] shadow-[0_0_10px_rgba(255,208,74,0.6)]"
                    >
                      <Lock className="h-3.5 w-3.5 text-[#2B1600]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative h-full w-full p-3">
                  <AnimatePresence mode="wait">
                    {isRolling && rollingDiceMask[index] === 1 ? (
                      <motion.div
                        key="rolling"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="h-full w-full"
                      >
                        <Image
                          src={`/images/${DICE_ROLL_FRAMES[(rollingFrame + index) % DICE_ROLL_FRAMES.length]}`}
                          alt="rolling dice"
                          width={80}
                          height={80}
                          className="h-full w-full object-contain"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`face-${die.value}`}
                        initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
                        className="h-full w-full"
                      >
                        <Image
                          src={`/images/dice-${die.value}.png`}
                          alt={`骰子 ${die.value}`}
                          width={80}
                          height={80}
                          className="h-full w-full object-contain"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] text-white/40">投掷机会</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((roll) => (
              <motion.div
                key={roll}
                className={`h-3 w-3 rounded-full ${
                  roll <= rollsLeft
                    ? 'bg-gradient-to-br from-[#FFD04A] to-[#D4A020] shadow-[0_0_8px_rgba(255,208,74,0.4)]'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <ScorePanel />

      {isCurrentUserTurn && (
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="absolute bottom-5 left-0 right-0 z-30 flex items-center justify-center"
      >
        <motion.button
          onClick={handleRoll}
          disabled={isRolling || rollsLeft <= 0}
          whileHover={isRolling || rollsLeft <= 0 ? {} : { scale: 1.05, boxShadow: '0 0 28px rgba(77,118,255,0.34)' }}
          whileTap={isRolling || rollsLeft <= 0 ? {} : { scale: 0.96 }}
          className={`flex min-w-[210px] items-center justify-center gap-2.5 rounded-xl border px-10 py-4 transition-all ${
            isRolling || rollsLeft <= 0
              ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
              : 'cursor-pointer border-blue-300/28 bg-[linear-gradient(180deg,rgba(40,70,180,0.88),rgba(15,22,93,0.9))] text-white shadow-[0_12px_28px_rgba(4,7,38,0.28),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md'
          }`}
        >
          <RotateCcw className={`h-5 w-5 ${isRolling ? 'animate-spin' : ''}`} />
          <span className="text-[17px] font-black">
            {isRolling ? '投掷中...' : rollsLeft <= 0 ? '已用完' : '开始投掷'}
          </span>
        </motion.button>
      </motion.div>
      )}
    </div>
  )
}

function GameSidePanel({
  players,
  teamMode,
}: {
  players: Player[]
  teamMode: boolean
}) {
  return (
    <aside className="absolute bottom-[90px] left-5 top-[110px] z-20 flex w-[250px] flex-col gap-3">
      <PlayerListPanel players={players} teamMode={teamMode} />
      <ChatPanel />
    </aside>
  )
}

function PlayerListPanel({ players, teamMode }: { players: Player[]; teamMode: boolean }) {
  const bluePlayers = players.filter((player) => player.team === 'blue')
  const redPlayers = players.filter((player) => player.team === 'red')

  return (
    <motion.section
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative flex-[1.05] overflow-hidden rounded-2xl border border-white/16 bg-[#0b1458]/54 shadow-[0_0_25px_rgba(76,91,255,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
    >
      <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-blue-400/8" />
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#FFD04A]" />
          <span className="text-[14px] font-black tracking-wider text-white/92">玩家列表</span>
        </div>
        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-bold text-white/60">{players.length} 人</span>
      </div>

      <div className="relative space-y-3 px-3 py-3">
        {teamMode ? (
          <>
            <TeamGroup title="蓝队" tone="blue" players={bluePlayers} />
            <TeamGroup title="红队" tone="red" players={redPlayers} />
          </>
        ) : (
          players.map((player) => <PlayerRow key={player.id} player={player} />)
        )}
      </div>
    </motion.section>
  )
}

function TeamGroup({ title, tone, players }: { title: string; tone: 'blue' | 'red'; players: Player[] }) {
  const isBlue = tone === 'blue'

  return (
    <div className={`rounded-xl border p-2 ${isBlue ? 'border-blue-300/18 bg-blue-400/8' : 'border-red-300/18 bg-red-400/8'}`}>
      <div className={`mb-2 flex items-center justify-between px-1 text-[12px] font-black ${isBlue ? 'text-blue-200' : 'text-red-200'}`}>
        <span>{title}</span>
        <span>{players.reduce((total, player) => total + player.score, 0).toLocaleString()}</span>
      </div>
      <div className="space-y-2">
        {players.map((player) => (
          <PlayerRow key={player.id} player={player} tone={tone} />
        ))}
      </div>
    </div>
  )
}

function PlayerRow({ player, tone = 'neutral' }: { player: Player; tone?: 'blue' | 'red' | 'neutral' }) {
  const toneClass =
    tone === 'red'
      ? 'border-red-300/20 bg-red-400/8'
      : tone === 'blue'
        ? 'border-blue-300/20 bg-blue-400/8'
        : 'border-white/10 bg-white/7'

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2 ${player.isCurrentTurn ? 'ring-1 ring-[#FFD04A]/40' : ''} ${toneClass}`}>
      <div className="relative">
        <div className={`relative h-[42px] w-[42px] overflow-hidden rounded-full border-2 ${player.isCurrentTurn ? 'border-[#FFD04A] shadow-[0_0_16px_rgba(255,208,74,0.58)]' : 'border-white/24 shadow-[0_0_12px_rgba(95,111,255,0.28)]'}`}>
          <Image src={player.avatar} alt={player.name} width={42} height={42} className="h-full w-full object-cover scale-110" />
        </div>
        {player.isCurrentTurn && (
          <motion.div
            animate={{ scale: [1, 1.16, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFD04A] shadow-[0_0_8px_rgba(255,208,74,0.6)]"
          >
            <Zap className="h-2.5 w-2.5 text-[#2B1600]" />
          </motion.div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold text-white">{player.name}</span>
          {player.isHost && <Crown className="h-3.5 w-3.5 shrink-0 text-[#FFD04A]" />}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-white/38" />
          <span className="text-[12px] font-bold text-white/68">{player.score.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function ChatPanel() {
  return (
    <motion.section
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative flex flex-[0.95] flex-col overflow-hidden rounded-2xl border border-white/16 bg-[#0b1458]/52 shadow-[0_0_25px_rgba(76,91,255,0.14),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md"
    >
      <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 via-transparent to-purple-400/8" />
      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-[14px] font-black tracking-wider text-white/92">房间消息</h2>
        <MessageSquare className="h-4 w-4 text-white/70" />
      </div>
      <div className="relative flex-1 space-y-2.5 overflow-hidden px-4 py-3 text-[12px] font-bold">
        <p className="leading-relaxed text-white/42">等待实时对局消息</p>
      </div>
      <div className="relative flex items-center gap-2 px-3 pb-3">
        <div className="flex h-9 w-[calc(100%-52px)] flex-none items-center gap-2 rounded-lg border border-white/10 bg-[#050418]/64 px-2.5 text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <input
            aria-label="输入消息"
            placeholder="输入消息..."
            className="min-w-0 flex-1 bg-transparent text-[12px] font-bold outline-none placeholder:text-white/42"
          />
          <Smile className="h-4 w-4 shrink-0" />
        </div>
        <button className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[linear-gradient(180deg,#8b7cff,#5745ff)] text-white shadow-[0_0_16px_rgba(96,84,255,0.56),inset_0_1px_0_rgba(255,255,255,0.24)] transition hover:-translate-y-[1px] hover:brightness-110">
          <Send className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>
    </motion.section>
  )
}

function ScorePanel() {
  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="absolute bottom-[74px] right-5 top-[88px] z-20 flex w-[340px] flex-col overflow-hidden rounded-[18px] border border-blue-200/34 bg-[#0b1b78]/76 p-3 shadow-[0_0_34px_rgba(76,118,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md"
    >
      <div className="pointer-events-none absolute -inset-[1px] rounded-[18px] bg-[radial-gradient(circle_at_20%_0%,rgba(86,120,255,0.22),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_30%)]" />
      <div className="relative mb-2 flex items-center justify-center gap-3 py-1.5">
        <Settings className="h-4 w-4 text-blue-200/58" />
        <span className="text-[22px] font-black tracking-[0.06em] text-white [text-shadow:0_0_10px_rgba(94,124,255,0.7)]">计分盘</span>
        <Settings className="h-4 w-4 text-blue-200/58" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[8px] bg-[#e6e7ff]/92 text-[#071058] shadow-[inset_0_0_0_1px_rgba(72,91,190,0.32)]">
        <div className="grid grid-cols-[1fr_64px_64px] bg-[#07105a] text-[13px] font-black text-white">
          <div className="px-3 py-2">{scoreSections[0].title}</div>
          <div className="border-l border-blue-300/22 px-2 py-2 text-center">我方</div>
          <div className="border-l border-blue-300/22 px-2 py-2 text-center">对方</div>
        </div>

        <div className="max-h-[calc(100%-42px)] overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-900/28 [&::-webkit-scrollbar]:w-1">
          {scoreSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && (
                <div className="grid grid-cols-[1fr_64px_64px] bg-[#07105a] text-[13px] font-black text-white">
                  <div className="px-3 py-1.5">{section.title}</div>
                  <div className="border-l border-blue-300/18" />
                  <div className="border-l border-blue-300/18" />
                </div>
              )}

              {section.rows.map((row) => (
                <div
                  key={row.key}
                  className={`grid min-h-[27px] grid-cols-[1fr_64px_64px] border-b border-[#6e7bd6]/28 text-[13px] font-black ${
                    row.strong ? 'bg-[#dce0ff]' : 'bg-[#eef0ff]'
                  }`}
                >
                  <div className={`flex items-center px-3 ${row.accent ? 'text-[#12227d]' : ''}`}>{row.label}</div>
                  <ScoreCell />
                  <ScoreCell />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-[1fr_62px_62px] items-center gap-1">
        <div className="pl-2 text-[24px] font-black tracking-[0.04em] text-white [text-shadow:0_0_10px_rgba(94,124,255,0.65)]">总分</div>
        <div className="h-[50px] rounded-lg border border-blue-400/40 bg-[#07105a]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" />
        <div className="h-[50px] rounded-lg border border-red-400/30 bg-[#080631]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
      </div>
    </motion.div>
  )
}

function ScoreCell() {
  return <div className="border-l border-[#6e7bd6]/30" />
}
