'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { NavigationNoticeDialog } from '@/components/NavigationNoticeDialog'
import { useBrowserBackGuard } from '@/hooks/useBrowserBackGuard'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { readMatchSnapshot, startMatch } from '@/services/match'
import { connectMatchChannel } from '@/websocket/match'
import { VsView, type Barrage, type Player } from './components/VsView'
import { buildVsDisplayPlayers, normalizeMatchPlayer } from './utils/players'

const modeConfig: Record<string, { name: string; layout: 'duel' | 'three' | 'four' | 'team' }> = {
  'solo-2p': { name: '2人对战', layout: 'duel' },
  'solo-3p': { name: '3人混战', layout: 'three' },
  'solo-4p': { name: '4人混战', layout: 'four' },
  'team-2v2': { name: '2V2 组队', layout: 'team' },
  'team-3v3': { name: '3V3 组队', layout: 'team' },
  'team-5v5': { name: '5V5 组队', layout: 'team' },
}

// VS 过场页容器，负责启动对局、展示入场动画并按时跳转正式对局页。
export default function VsLoadingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const matchId = params?.matchId as string
  const modeKey = searchParams.get('mode') ?? 'solo-2p'
  const isHostView = searchParams.get('role') === 'host'
  const isGuestView = searchParams.get('guest') === 'true'
  const mode = modeConfig[modeKey] ?? modeConfig['solo-2p']
  const [phase, setPhase] = useState<'enter' | 'ready'>('enter')
  const [barrages, setBarrages] = useState<Barrage[]>([])
  const [showExitNotice, setShowExitNotice] = useState(false)
  const [matchPlayers] = useState<Player[]>(() => readMatchSnapshot(matchId)?.players.map(normalizeMatchPlayer) ?? [])
  const barrageIdRef = useRef(0)
  const hasStartedMatchRef = useRef(false)
  const displayPlayers = useMemo(() => buildVsDisplayPlayers(matchPlayers, currentUser), [currentUser, matchPlayers])
  const navigateAfterBackGuard = useBrowserBackGuard(() => setShowExitNotice(true))

  useEffect(() => {
    if (!matchId || isGuestView) return

    return connectMatchChannel({
      matchId,
      onOpen: () => {
        if (!isHostView || hasStartedMatchRef.current) return

        hasStartedMatchRef.current = true
        void startMatch({ match_id: matchId }).catch((error) => {
          hasStartedMatchRef.current = false

          if (process.env.NODE_ENV === 'development') {
            console.error('[start match error]', error)
          }
        })
      },
      onMessage: ({ rawType, message }) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[vs match event]', { rawType, message })
        }
      },
    })
  }, [isGuestView, isHostView, matchId])

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setPhase('ready'), 900)
    const redirectTimer = window.setTimeout(() => {
      navigateAfterBackGuard(() => {
        router.replace(`/game/${matchId}?mode=${modeKey}&role=${isHostView ? 'host' : 'player'}${isGuestView ? '&guest=true' : ''}`)
      })
    }, 5200)

    return () => {
      window.clearTimeout(readyTimer)
      window.clearTimeout(redirectTimer)
    }
  }, [isGuestView, isHostView, matchId, modeKey, navigateAfterBackGuard, router])

  // 添加一条临时弹幕，并在动画结束后从状态中移除。
  function sendBarrage(text: string) {
    const id = Date.now() + barrageIdRef.current
    const top = 18 + ((barrageIdRef.current * 13) % 42)
    barrageIdRef.current += 1
    setBarrages((current) => [...current, { id, text, top }])
    window.setTimeout(() => {
      setBarrages((current) => current.filter((item) => item.id !== id))
    }, 4300)
  }

  return (
    <>
      <VsView
        modeName={mode.name}
        layout={mode.layout}
        phase={phase}
        players={displayPlayers}
        barrages={barrages}
        onSendBarrage={sendBarrage}
      />
      <NavigationNoticeDialog
        open={showExitNotice}
        title="暂时无法退出"
        message="你当前处于对局中，不可退出。请完成本局游戏后再离开。"
        onClose={() => setShowExitNotice(false)}
      />
    </>
  )
}
