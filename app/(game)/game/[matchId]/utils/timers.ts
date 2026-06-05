import type { MutableRefObject } from 'react'

type SetNumberState = (updater: (current: number) => number) => void

// 清理 timeout ref，并把 ref 置空，避免重复清理。
export function clearTimeoutRef(ref: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (!ref.current) return

  clearTimeout(ref.current)
  ref.current = null
}

// 清理 interval ref，并把 ref 置空，避免重复清理。
export function clearIntervalRef(ref: MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (!ref.current) return

  clearInterval(ref.current)
  ref.current = null
}

// 清理一个回合内的自动投掷和选分倒计时。
export function clearTurnTimers({
  countdownTimerRef,
  autoRollTimerRef,
  autoRollHintTimerRef,
}: {
  countdownTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
  autoRollTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  autoRollHintTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
}) {
  clearIntervalRef(countdownTimerRef)
  clearTimeoutRef(autoRollTimerRef)
  clearIntervalRef(autoRollHintTimerRef)
}

// 清理整场对局相关的投掷、远端投掷和回合计时器。
export function clearMatchTimers({
  rollTimerRef,
  remoteRollTimerRef,
  autoRollTimerRef,
  autoRollHintTimerRef,
  countdownTimerRef,
}: {
  rollTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  remoteRollTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  autoRollTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  autoRollHintTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
  countdownTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
}) {
  clearTimeoutRef(rollTimerRef)
  clearTimeoutRef(remoteRollTimerRef)
  clearTurnTimers({
    countdownTimerRef,
    autoRollTimerRef,
    autoRollHintTimerRef,
  })
}

// 开始投掷前清掉旧投掷动画和回合计时器。
export function clearRollStartTimers({
  rollTimerRef,
  countdownTimerRef,
  autoRollTimerRef,
  autoRollHintTimerRef,
}: {
  rollTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  countdownTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
  autoRollTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  autoRollHintTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
}) {
  clearTimeoutRef(rollTimerRef)
  clearTurnTimers({
    countdownTimerRef,
    autoRollTimerRef,
    autoRollHintTimerRef,
  })
}

// 启动自动投掷提示秒数的倒计时，并返回对应清理函数。
export function startAutoRollHintTimer({
  autoRollHintTimerRef,
  turnSeconds,
  setAutoRollHintSeconds,
}: {
  autoRollHintTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
  turnSeconds: number
  setAutoRollHintSeconds: SetNumberState
}) {
  const resetHintTimer = window.setTimeout(() => setAutoRollHintSeconds(() => turnSeconds), 0)
  clearIntervalRef(autoRollHintTimerRef)
  autoRollHintTimerRef.current = setInterval(() => {
    setAutoRollHintSeconds((current) => Math.max(current - 1, 0))
  }, 1000)

  return () => {
    window.clearTimeout(resetHintTimer)
    clearIntervalRef(autoRollHintTimerRef)
  }
}
