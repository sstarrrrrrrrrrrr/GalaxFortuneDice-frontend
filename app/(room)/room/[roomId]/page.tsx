'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useClientMounted } from '@/hooks/useClientMounted'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLatestRef } from '@/hooks/useLatestRef'
import { AUTH_TOKEN_STORAGE_KEY } from '@/services/api'
import { storeMatchSnapshot, type MatchInfoPlayer, type StartMatchResponse } from '@/services/match'
import { getRoomAuthTokenStorageKey, leaveRoom, updatePlayerReady } from '@/services/room'
import { normalizeAvatarSrc } from '@/utils/avatar'
import { connectRoomChannel, type RoomChannelNotice } from '@/websocket/room'
import { RoomView, type RoomDialog, type RoomPlayer as Player } from './components/RoomView'
import {
  applyReadyResponseToPlayers,
  buildDisplayRoomPlayers,
  mergeRoomPlayer,
  mergeRoomSnapshotPlayers,
  normalizeMatchInfoPlayers,
  readStoredRoomPlayers,
} from './utils/roomPlayers'

type ModeKey = 'solo-2p' | 'solo-3p' | 'solo-4p' | 'team-2v2' | 'team-3v3' | 'team-5v5'

const modeConfig: Record<ModeKey, { name: string; maxPlayers: number; teamMode?: boolean }> = {
  'solo-2p': { name: '单人挑战', maxPlayers: 2 },
  'solo-3p': { name: '三人混战', maxPlayers: 3 },
  'solo-4p': { name: '四人混战', maxPlayers: 4 },
  'team-2v2': { name: '2V2 组队', maxPlayers: 4, teamMode: true },
  'team-3v3': { name: '3V3 组队', maxPlayers: 4, teamMode: true },
  'team-5v5': { name: '5V5 组队', maxPlayers: 4, teamMode: true },
}

const roomCode = '123456'

// 构造本地兜底玩家，用于首次渲染或游客模式的占位展示。
function createInitialPlayers(
  currentUser: ReturnType<typeof useCurrentUser>,
  isHostView: boolean,
): Player[] {
  const currentPlayerId = currentUser?.id ?? (isHostView ? 1 : 2)
  const currentPlayer = {
    id: currentPlayerId,
    name: currentUser?.nickname ?? (isHostView ? '房主玩家' : '加入玩家'),
    avatar: normalizeAvatarSrc(currentUser?.avatar),
    ready: isHostView,
    isHost: isHostView,
  }

  if (isHostView) {
    return [currentPlayer]
  }

  return [currentPlayer]
}

// 读取当前房间专属 token，找不到时回退到全局登录 token。
function readStoredRoomAuthToken(roomId: string) {
  if (typeof window === 'undefined' || !roomId) return ''

  return window.sessionStorage.getItem(getRoomAuthTokenStorageKey(roomId)) ?? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

// 房间页容器，管理房间玩家状态、准备/开始/离开操作和房间 WebSocket 同步。
export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const hasMounted = useClientMounted()
  const hydratedUser = hasMounted ? currentUser : null
  const roomId = (params?.roomId as string) || roomCode
  const displayRoomCode = decodeURIComponent(roomId)
  const numericRoomCode = Number(displayRoomCode)
  const apiRoomId = Number.isInteger(numericRoomCode) && numericRoomCode > 0 ? numericRoomCode : displayRoomCode
  const requestedMode = searchParams.get('mode') || roomId
  const modeKey = (requestedMode in modeConfig ? requestedMode : 'solo-3p') as ModeKey
  const maxPlayersParam = Number(searchParams.get('maxPlayers'))
  const config = {
    ...(modeConfig[modeKey] ?? modeConfig['solo-3p']),
    maxPlayers: Number.isFinite(maxPlayersParam) && maxPlayersParam > 0 ? maxPlayersParam : (modeConfig[modeKey] ?? modeConfig['solo-3p']).maxPlayers,
  }
  const isGuestView = searchParams.get('guest') === 'true'
  const roleParam = searchParams.get('role')
  const creatorIdParam = Number(searchParams.get('creatorId'))
  const hasCreatorIdParam = Number.isFinite(creatorIdParam) && creatorIdParam > 0
  const isHostView = roleParam === 'host' || (roleParam !== 'player' && hasCreatorIdParam && hydratedUser?.id === creatorIdParam)
  const creatorId = hasCreatorIdParam ? creatorIdParam : isHostView ? hydratedUser?.id : undefined
  const [players, setPlayers] = useState(() => createInitialPlayers(null, isHostView))
  const [roomMessages, setRoomMessages] = useState<RoomChannelNotice[]>([])
  const [notice, setNotice] = useState('')
  const [isUpdatingReady, setIsUpdatingReady] = useState(false)
  const [isStartingMatch, setIsStartingMatch] = useState(false)
  const [isLeavingRoom, setIsLeavingRoom] = useState(false)
  const [roomDialog, setRoomDialog] = useState<RoomDialog | null>(null)
  const playersRef = useLatestRef(players)
  const currentPlayerId = hydratedUser?.id ?? (isHostView ? 1 : 2)
  const placeholderPlayerId = isHostView ? 1 : 2
  const localPlayerStateId = players.some((player) => player.id === currentPlayerId) ? currentPlayerId : placeholderPlayerId
  const isCreator = Boolean(creatorId && currentPlayerId === creatorId)
  const displayPlayers = useMemo(
    () => buildDisplayRoomPlayers({
      players,
      currentPlayerId,
      placeholderPlayerId,
      hydratedUser,
      isHostView,
      creatorId,
    }),
    [creatorId, currentPlayerId, hydratedUser, isHostView, placeholderPlayerId, players],
  )
  const currentPlayer = displayPlayers.find((player) => player.id === currentPlayerId)
  const localJoinMessage = useMemo<RoomChannelNotice | null>(() => {
    if (isGuestView || isHostView || !hasMounted) return null

    const joinedPlayerName = hydratedUser?.nickname ?? currentPlayer?.name
    if (!joinedPlayerName) return null

    return {
      id: `local-join-${displayRoomCode}-${currentPlayerId}`,
      name: joinedPlayerName,
      text: '进入房间',
      tone: 'cyan',
    }
  }, [currentPlayer?.name, currentPlayerId, displayRoomCode, hasMounted, hydratedUser?.nickname, isGuestView, isHostView])
  const displayRoomMessages = useMemo(() => {
    const playerNames = new Set(displayPlayers.map((player) => player.name))
    const messages = localJoinMessage
      ? [
          localJoinMessage,
          ...roomMessages.filter((message) => message.name !== localJoinMessage.name || message.text !== localJoinMessage.text),
        ]
      : roomMessages

    return messages.filter(
      (message) => message.name === '系统' || playerNames.has(message.name) || message.text === '进入房间' || message.text === '离开房间',
    )
  }, [displayPlayers, localJoinMessage, roomMessages])
  const allJoined = players.length === config.maxPlayers
  const everyoneReady = players.every((player) => player.ready)
  const canHostStart = isCreator && (isGuestView || (allJoined && everyoneReady))
  const isPlayerReady = Boolean(currentPlayer?.ready)
  const roomActionLabel = isCreator ? '开始游戏' : isUpdatingReady ? '更新中...' : isPlayerReady ? '取消准备' : '准备'
  const roomActionHint = isCreator ? (canHostStart ? '全员已准备' : '等待其他玩家准备') : isPlayerReady ? '点击取消准备状态' : '点击确认准备状态'
  const roomActionButtonClass = `absolute bottom-[8.8%] left-[50.4%] z-20 flex h-[8.8vh] min-h-[64px] w-[24vw] min-w-[280px] -translate-x-1/2 flex-col items-center justify-center overflow-hidden rounded-[14px] border backdrop-blur-[14px] transition hover:-translate-y-[1px] hover:brightness-110 active:translate-y-0 disabled:cursor-wait disabled:opacity-70 before:pointer-events-none before:absolute before:inset-x-[9%] before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.72),transparent)] after:pointer-events-none after:absolute after:inset-x-[18%] after:bottom-[-14px] after:h-[28px] after:rounded-[50%] after:border after:border-white/12 ${
    isCreator
      ? 'border-[#ffe767]/54 bg-[linear-gradient(135deg,rgba(89,50,210,0.92),rgba(21,93,255,0.92)_58%,rgba(18,210,255,0.82))] text-[#fff1a0] shadow-[0_16px_34px_rgba(2,5,38,0.38),0_0_22px_rgba(255,211,52,0.24),0_0_30px_rgba(55,129,255,0.28),inset_0_1px_0_rgba(255,255,255,0.24)]'
      : isPlayerReady
        ? 'border-[#66eaff]/62 bg-[linear-gradient(135deg,rgba(24,51,158,0.92),rgba(22,122,255,0.92)_60%,rgba(20,225,255,0.82))] text-[#cbfbff] shadow-[0_16px_34px_rgba(2,5,38,0.38),0_0_24px_rgba(40,226,255,0.32),inset_0_1px_0_rgba(255,255,255,0.24)]'
        : 'border-[#7d8dff]/56 bg-[linear-gradient(135deg,rgba(77,56,210,0.92),rgba(24,92,255,0.92)_62%,rgba(39,202,255,0.72))] text-white shadow-[0_16px_34px_rgba(2,5,38,0.38),0_0_24px_rgba(92,112,255,0.32),inset_0_1px_0_rgba(255,255,255,0.24)]'
  }`

  // 追加房间消息，并去重相同提示以避免 WebSocket 重连造成重复展示。
  function appendRoomMessage(message: RoomChannelNotice) {
    setRoomMessages((messages) => {
      const hasSameMessage = messages.some((item) => item.name === message.name && item.text === message.text)

      if (hasSameMessage) {
        return messages
      }

      return [...messages.slice(-19), message]
    })
  }

  // 展示房间关闭提示，主要用于房主离开导致房间解散的场景。
  const showRoomClosedDialog = useCallback(() => {
    setRoomDialog({
      title: '房主离开提醒',
      message: '房主已离开当前房间，房间将自动解散。',
      confirmText: '返回大厅',
      tone: 'info',
      onConfirm: () => router.push('/lobby'),
    })
  }, [router])

  // 收到开局信息后写入对局快照，并携带模式/身份参数进入 VS 过场页。
  const enterMatch = useCallback(
    (match: StartMatchResponse) => {
      const latestPlayers = playersRef.current
      const matchInfo: MatchInfoPlayer[] = match.match_info?.length
        ? match.match_info
        : latestPlayers.map((player, index) => ({
            user_id: player.id,
            nickname: player.name,
            avatar: player.avatar,
            team_id: 1,
            seat_no: player.seatNo ?? index + 1,
            ready_status: player.ready,
            is_online: true,
          }))

      storeMatchSnapshot({ ...match, match_info: matchInfo }, apiRoomId)
      router.push(`/game/${encodeURIComponent(String(match.match_id))}/vs?mode=${modeKey}&role=${isCreator ? 'host' : 'player'}${isGuestView ? '&guest=true' : ''}`)
    },
    [apiRoomId, isCreator, isGuestView, modeKey, playersRef, router],
  )

  useEffect(() => {
    if (!hasMounted) return

    const storedPlayersTimer = window.setTimeout(() => {
      const storedPlayers = readStoredRoomPlayers(displayRoomCode, creatorId)
      if (!storedPlayers) return

      setPlayers((currentPlayers) => mergeRoomSnapshotPlayers(currentPlayers, storedPlayers))
    }, 0)

    return () => window.clearTimeout(storedPlayersTimer)
  }, [creatorId, displayRoomCode, hasMounted])

  useEffect(() => {
    if (isGuestView || !displayRoomCode) return

    // 订阅当前房间的 WebSocket 广播；解析后的房间事件会统一进入 onMessage。
    return connectRoomChannel({
      roomId: displayRoomCode,
      authToken: readStoredRoomAuthToken(displayRoomCode),
      onMessage: ({ players: channelPlayers, player: channelPlayer, playerAction, matchId, matchInfo, notice: channelNotice, roomClosed }) => {
        // 后端明确广播房间关闭时，非房主需要提示并返回大厅。
        if (roomClosed && !isCreator) {
          showRoomClosedDialog()
          return
        }

        // 收到开局广播后，带着后端下发的对局信息进入 VS 过场页。
        if (matchId) {
          setIsStartingMatch(false)
          enterMatch({
            match_id: matchId,
            match_info: normalizeMatchInfoPlayers(matchInfo),
          })
          return
        }

        // 兼容后端只广播“房主离开”的情况：房主离开等同于房间解散。
        if (playerAction === 'leave' && channelPlayer?.id === creatorId && !isCreator) {
          showRoomClosedDialog()
          return
        }

        // 优先使用完整玩家列表；如果只收到单个玩家变更，则在本地合并。
        if (channelPlayers) {
          setPlayers(channelPlayers)
        } else if (channelPlayer) {
          setPlayers((currentPlayers) => {
            const mergedPlayers = mergeRoomPlayer(currentPlayers, channelPlayer, playerAction)

            if (process.env.NODE_ENV === 'development') {
              console.log('[room players merge]', {
                action: playerAction,
                patch: channelPlayer,
                before: currentPlayers.map((player) => ({ id: player.id, name: player.name, ready: player.ready })),
                after: mergedPlayers.map((player) => ({ id: player.id, name: player.name, ready: player.ready })),
              })
            }

            return mergedPlayers
          })
        }

        if (channelNotice) {
          appendRoomMessage(channelNotice)
        }
      },
    })
  }, [creatorId, displayRoomCode, enterMatch, isCreator, isGuestView, router, showRoomClosedDialog])

  // 展示短时反馈提示，自动清理避免长期遮挡房间操作。
  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1700)
  }

  // 处理房主开始游戏或普通玩家切换准备状态。
  async function handleRoomAction() {
    if (isCreator) {
      if (isStartingMatch) return

      if (!canHostStart) {
        showNotice(!allJoined ? '人数未到齐' : '有玩家未准备')
        return
      }

      if (isGuestView) {
        router.push(`/game/match-001/vs?mode=${modeKey}&guest=true`)
        return
      }

      try {
        setIsStartingMatch(true)
        await updatePlayerReady({
          room_id: apiRoomId,
          user_id: hydratedUser?.id ?? currentPlayerId,
          ready_status: true,
        })
        showNotice('绛夊緟瀵瑰眬鍚屾...')
      } catch (error) {
        showNotice(error instanceof Error && error.message ? error.message : '寮€濮嬪灞€澶辫触')
        setIsStartingMatch(false)
      }
      return
    }

    if (!currentPlayer) return

    const nextReadyStatus = !currentPlayer.ready

    if (!isGuestView) {
      try {
        setIsUpdatingReady(true)
        const readyResponse = await updatePlayerReady({
          room_id: apiRoomId,
          user_id: hydratedUser?.id ?? currentPlayerId,
          ready_status: nextReadyStatus,
        })
        setPlayers((currentPlayers) =>
          applyReadyResponseToPlayers({
            currentPlayers,
            response: readyResponse,
            fallbackUserId: hydratedUser?.id ?? currentPlayerId,
            fallbackReadyStatus: nextReadyStatus,
            creatorId,
          }),
        )
        showNotice(nextReadyStatus ? '已准备' : '已取消准备')
      } catch (error) {
        showNotice(error instanceof Error && error.message ? error.message : '更新准备状态失败')
        return
      } finally {
        setIsUpdatingReady(false)
      }
    } else {
      showNotice(nextReadyStatus ? '已准备' : '已取消准备')
    }

    if (isGuestView) {
      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.id === localPlayerStateId ? { ...player, ready: nextReadyStatus } : player,
        ),
      )
    }
  }

  // 复制房间号到剪贴板，并在失败时提示用户手动复制。
  async function handleCopyRoomCode() {
    try {
      await navigator.clipboard.writeText(displayRoomCode)
      showNotice('已复制房间号')
    } catch {
      showNotice('复制失败，请手动复制')
    }
  }

  // 执行真正的离开房间请求，游客模式直接回到游客大厅。
  async function executeLeaveRoom() {
    if (isLeavingRoom) return

    // 游客房间没有后端离房状态，直接回到游客大厅。
    if (isGuestView) {
      router.push('/lobby?mode=guest')
      return
    }

    try {
      setIsLeavingRoom(true)
      await leaveRoom({
        room_id: apiRoomId,
        user_id: currentPlayerId,
      })
      router.push('/lobby')
    } catch (error) {
      showNotice(error instanceof Error && error.message ? error.message : '离开房间失败')
    } finally {
      setIsLeavingRoom(false)
    }
  }

  // 处理离开按钮：普通玩家直接离开，房主需要二次确认以避免误解散房间。
  function handleLeaveRoom() {
    if (isLeavingRoom) return

    // 普通玩家离开不需要二次确认；房主离开会导致房间解散，需要确认。
    if (!isCreator) {
      void executeLeaveRoom()
      return
    }

    setRoomDialog({
      title: '房主离开提醒',
      message: '你是当前房间的房主，离开后房间将自动解散。确定离开吗？',
      confirmText: '确认离开',
      cancelText: '取消',
      tone: 'danger',
      onConfirm: () => {
        setRoomDialog(null)
        void executeLeaveRoom()
      },
    })
  }

  return (
    <RoomView
      modeName={config.name}
      maxPlayers={config.maxPlayers}
      playerCount={players.length}
      displayRoomCode={displayRoomCode}
      displayPlayers={displayPlayers}
      displayRoomMessages={displayRoomMessages}
      notice={notice}
      roomDialog={roomDialog}
      isLeavingRoom={isLeavingRoom}
      isUpdatingReady={isUpdatingReady}
      isStartingMatch={isStartingMatch}
      roomActionLabel={roomActionLabel}
      roomActionHint={roomActionHint}
      roomActionButtonClass={roomActionButtonClass}
      onCopyRoomCode={handleCopyRoomCode}
      onLeaveRoom={handleLeaveRoom}
      onRoomAction={handleRoomAction}
      onCancelDialog={() => setRoomDialog(null)}
    />
  )
}
