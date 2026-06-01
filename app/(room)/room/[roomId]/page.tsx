'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Ban, Check, Copy, MessageSquare, Plus, Send, Smile } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { AUTH_TOKEN_STORAGE_KEY } from '@/services/api'
import { storeMatchSnapshot, type MatchInfoPlayer, type StartMatchResponse } from '@/services/match'
import { getRoomAuthTokenStorageKey, getRoomSnapshotStorageKey, leaveRoom, updatePlayerReady, type RoomInfo, type RoomUserInfo, type UpdatePlayerReadyResponse } from '@/services/room'
import { normalizeAvatarSrc } from '@/utils/avatar'
import { connectRoomChannel, type RoomChannelNotice, type RoomChannelPlayerPatch } from '@/websocket/room'

type ModeKey = 'solo-2p' | 'solo-3p' | 'solo-4p' | 'team-2v2' | 'team-3v3' | 'team-5v5'

type Player = {
  id: number
  name: string
  avatar?: string
  emoji?: string
  ready: boolean
  seatNo?: number
  isHost?: boolean
}

type RoomDialog = {
  title: string
  message: string
  confirmText: string
  cancelText?: string
  tone: 'danger' | 'info'
  onConfirm: () => void
}

const modeConfig: Record<ModeKey, { name: string; maxPlayers: number; teamMode?: boolean }> = {
  'solo-2p': { name: '单人挑战', maxPlayers: 2 },
  'solo-3p': { name: '三人混战', maxPlayers: 3 },
  'solo-4p': { name: '四人混战', maxPlayers: 4 },
  'team-2v2': { name: '2V2 组队', maxPlayers: 4, teamMode: true },
  'team-3v3': { name: '3V3 组队', maxPlayers: 4, teamMode: true },
  'team-5v5': { name: '5V5 组队', maxPlayers: 4, teamMode: true },
}

const roomCode = '123456'
const visibleSlots = 4

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

function normalizeRoomPlayer(player: RoomUserInfo, creatorId?: number): Player | null {
  const id = player.user_id ?? player.id
  const name = player.nickname

  if (!id || !name) return null

  return {
    id,
    name,
    avatar: normalizeAvatarSrc(player.avatar),
    ready: Boolean(player.ready_status),
    seatNo: player.seat_no,
    isHost: id === creatorId,
  }
}

function sortRoomPlayers(players: Player[]) {
  return [...players].sort((playerA, playerB) => (playerA.seatNo ?? Number.MAX_SAFE_INTEGER) - (playerB.seatNo ?? Number.MAX_SAFE_INTEGER))
}

function mergeRoomPlayer(currentPlayers: Player[], nextPlayer: RoomChannelPlayerPatch, action?: 'join' | 'leave' | 'ready') {
  if (action === 'leave') {
    return currentPlayers.filter((player) => player.id !== nextPlayer.id)
  }

  const hasPlayer = currentPlayers.some((player) => player.id === nextPlayer.id)
  if (hasPlayer) {
    return sortRoomPlayers(currentPlayers.map((player) => {
      if (player.id !== nextPlayer.id) return player

      return {
        ...player,
        ...nextPlayer,
        name: nextPlayer.name ?? player.name,
        avatar: nextPlayer.avatar ?? player.avatar,
        ready: nextPlayer.ready ?? player.ready,
      }
    }))
  }

  if (!nextPlayer.name) {
    return currentPlayers
  }

  return sortRoomPlayers([...currentPlayers, { ...nextPlayer, name: nextPlayer.name, ready: nextPlayer.ready ?? false }])
}

function mergeRoomSnapshotPlayers(currentPlayers: Player[], snapshotPlayers: Player[]) {
  const snapshotPlayerIds = new Set(snapshotPlayers.map((player) => player.id))
  const hasOnlyLocalPlaceholder =
    currentPlayers.length === 1 &&
    !currentPlayers[0].seatNo &&
    (currentPlayers[0].id === 1 || currentPlayers[0].id === 2)

  if (hasOnlyLocalPlaceholder) {
    return snapshotPlayers
  }

  const mergedPlayers = snapshotPlayers.map((snapshotPlayer) => {
    const currentPlayer = currentPlayers.find((player) => player.id === snapshotPlayer.id)

    if (!currentPlayer) return snapshotPlayer

    return {
      ...snapshotPlayer,
      ready: currentPlayer.ready,
      isHost: snapshotPlayer.isHost || currentPlayer.isHost,
    }
  })
  const extraPlayers = currentPlayers.filter((player) => !snapshotPlayerIds.has(player.id) && player.name)

  return sortRoomPlayers([...mergedPlayers, ...extraPlayers])
}

function readStoredRoomPlayers(roomId: string, creatorId?: number) {
  if (typeof window === 'undefined' || !roomId) return null

  const storedSnapshot = window.sessionStorage.getItem(getRoomSnapshotStorageKey(roomId))
  if (!storedSnapshot) return null

  try {
    const roomSnapshot = JSON.parse(storedSnapshot) as RoomInfo
    const snapshotCreatorId = roomSnapshot.creator_id ?? roomSnapshot.owner_id ?? creatorId
    const snapshotPlayers = roomSnapshot.players
      ?.map((player) => normalizeRoomPlayer(player, snapshotCreatorId))
      .filter((player): player is Player => Boolean(player))

    return snapshotPlayers && snapshotPlayers.length > 0 ? sortRoomPlayers(snapshotPlayers) : null
  } catch {
    window.sessionStorage.removeItem(getRoomSnapshotStorageKey(roomId))
    return null
  }
}

function readStoredRoomAuthToken(roomId: string) {
  if (typeof window === 'undefined' || !roomId) return ''

  return window.sessionStorage.getItem(getRoomAuthTokenStorageKey(roomId)) ?? window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

function readReadyResponsePlayers(response: UpdatePlayerReadyResponse | null | undefined, creatorId?: number) {
  if (!response) return undefined

  const responseRoom = response.room
  const responsePlayers = responseRoom?.players ?? response.players
  const responseCreatorId = responseRoom?.creator_id ?? responseRoom?.owner_id ?? creatorId

  const players = responsePlayers
    ?.map((player) => normalizeRoomPlayer(player, responseCreatorId))
    .filter((player): player is Player => Boolean(player))

  return players ? sortRoomPlayers(players) : undefined
}

function readReadyResponsePlayerPatch(
  response: UpdatePlayerReadyResponse | null | undefined,
  fallbackUserId: number,
  fallbackReadyStatus: boolean,
  creatorId?: number,
): RoomChannelPlayerPatch {
  if (!response) {
    return {
      id: fallbackUserId,
      ready: fallbackReadyStatus,
    }
  }

  const responsePlayer = response.player ?? response.user
  const normalizedPlayer = responsePlayer ? normalizeRoomPlayer(responsePlayer, creatorId) : null

  if (normalizedPlayer) {
    return normalizedPlayer
  }

  return {
    id: response.user_id ?? responsePlayer?.user_id ?? responsePlayer?.id ?? fallbackUserId,
    ready: response.ready_status ?? responsePlayer?.ready_status ?? fallbackReadyStatus,
  }
}

export default function RoomPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const [hasMounted, setHasMounted] = useState(false)
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
  const isHostView = searchParams.get('role') !== 'player'
  const isGuestView = searchParams.get('guest') === 'true'
  const creatorIdParam = Number(searchParams.get('creatorId'))
  const creatorId = Number.isFinite(creatorIdParam) && creatorIdParam > 0 ? creatorIdParam : isHostView ? hydratedUser?.id : undefined
  const [players, setPlayers] = useState(() => createInitialPlayers(null, isHostView))
  const [roomMessages, setRoomMessages] = useState<RoomChannelNotice[]>([])
  const [notice, setNotice] = useState('')
  const [isUpdatingReady, setIsUpdatingReady] = useState(false)
  const [isStartingMatch, setIsStartingMatch] = useState(false)
  const [isLeavingRoom, setIsLeavingRoom] = useState(false)
  const [roomDialog, setRoomDialog] = useState<RoomDialog | null>(null)
  const playersRef = useRef(players)
  const currentPlayerId = hydratedUser?.id ?? (isHostView ? 1 : 2)
  const placeholderPlayerId = isHostView ? 1 : 2
  const localPlayerStateId = players.some((player) => player.id === currentPlayerId) ? currentPlayerId : placeholderPlayerId
  const isCreator = Boolean(creatorId && currentPlayerId === creatorId)
  const displayPlayers = useMemo(
    () => {
      const hasCurrentPlayer = players.some((player) => player.id === currentPlayerId)

      return players.map((player) => {
        const isLocalPlaceholder = !hasCurrentPlayer && player.id === placeholderPlayerId

        if (isLocalPlaceholder) {
          return {
            ...player,
            id: currentPlayerId,
            name: hydratedUser?.nickname ?? player.name,
            avatar: normalizeAvatarSrc(hydratedUser?.avatar || player.avatar),
            isHost: player.isHost || isHostView || player.id === creatorId || currentPlayerId === creatorId,
          }
        }

        if (player.id === creatorId) {
          return { ...player, isHost: true }
        }

        return player
      })
    },
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

  function appendRoomMessage(message: RoomChannelNotice) {
    setRoomMessages((messages) => {
      const hasSameMessage = messages.some((item) => item.name === message.name && item.text === message.text)

      if (hasSameMessage) {
        return messages
      }

      return [...messages.slice(-19), message]
    })
  }

  const showRoomClosedDialog = useCallback(() => {
    setRoomDialog({
      title: '房主离开提醒',
      message: '房主已离开当前房间，房间将自动解散。',
      confirmText: '返回大厅',
      tone: 'info',
      onConfirm: () => router.push('/lobby'),
    })
  }, [router])

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
    [apiRoomId, isCreator, isGuestView, modeKey, router],
  )

  useEffect(() => {
    playersRef.current = players
  }, [players])

  useEffect(() => {
    const mountedTimer = window.setTimeout(() => setHasMounted(true), 0)

    return () => window.clearTimeout(mountedTimer)
  }, [])

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
            match_info: (matchInfo ?? []) as StartMatchResponse['match_info'],
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

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1700)
  }

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
        const responsePlayers = readReadyResponsePlayers(readyResponse, creatorId)

        if (responsePlayers && responsePlayers.length > 0) {
          setPlayers(responsePlayers)
        } else {
          const readyPlayerPatch = readReadyResponsePlayerPatch(readyResponse, hydratedUser?.id ?? currentPlayerId, nextReadyStatus, creatorId)
          setPlayers((currentPlayers) =>
            mergeRoomPlayer(
              currentPlayers,
              readyPlayerPatch,
              'ready',
            ),
          )
        }
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

  async function handleCopyRoomCode() {
    try {
      await navigator.clipboard.writeText(displayRoomCode)
      showNotice('已复制房间号')
    } catch {
      showNotice('复制失败，请手动复制')
    }
  }

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
    <main className="relative h-screen min-h-[560px] w-screen min-w-[960px] overflow-hidden bg-[#020423] text-white">
      <Image src="/images/room-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_53%_45%,rgba(116,70,255,0.2),transparent_34%),radial-gradient(circle_at_78%_24%,rgba(57,123,255,0.14),transparent_24%),linear-gradient(180deg,rgba(1,3,34,0.08),rgba(1,3,34,0.46))]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[radial-gradient(ellipse_at_center,rgba(39,40,255,0.28),transparent_64%)]" />

      <header className="absolute left-[2.1%] top-[3.5%] z-20">
        <Image
          src="/images/logo.png"
          alt="银河大乐骰"
          width={230}
          height={70}
          priority
          className="h-[6.5vh] w-auto object-contain drop-shadow-[0_0_12px_rgba(104,123,255,0.72)]"
        />
      </header>

      <aside className="absolute left-[2.2%] top-[14.5%] z-20 flex w-[21.7%] min-w-[214px] flex-col gap-[1.7vh]">
        <section className="relative overflow-hidden rounded-[12px] border border-white/24 bg-[linear-gradient(180deg,rgba(58,67,194,0.62),rgba(15,18,98,0.76))] px-[7%] py-[6.4%] shadow-[0_14px_28px_rgba(2,5,38,0.24),0_0_20px_rgba(92,104,255,0.2),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-[10px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
          <div className="pointer-events-none absolute -right-[18%] -top-[35%] h-[62%] w-[70%] rounded-full bg-[#8794ff]/18 blur-[24px]" />
          <h2 className="relative mb-[5.5%] text-[clamp(13px,1.08vw,20px)] font-black tracking-[0.04em]">房间信息</h2>
          <div className="relative">
            <InfoRow label="游戏模式" value={config.name} />
            <InfoRow label="房间人数" value={`${Math.min(players.length, config.maxPlayers)}/${config.maxPlayers}`} />
            <InfoRow label="房主权限" value="可开始游戏" />
          </div>
        </section>

        <section className="relative flex h-[49.5vh] min-h-[290px] flex-col overflow-hidden rounded-[12px] border border-white/24 bg-[linear-gradient(180deg,rgba(45,55,178,0.62),rgba(8,10,74,0.8))] shadow-[0_14px_28px_rgba(2,5,38,0.24),0_0_20px_rgba(92,104,255,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-[10px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[24%] bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative flex items-center justify-between border-b border-white/10 px-[7%] pb-[4.5%] pt-[6%]">
            <h2 className="text-[clamp(13px,1.08vw,20px)] font-black tracking-[0.04em]">房间消息</h2>
            <MessageSquare className="h-[1.25vw] max-h-[21px] min-h-[15px] w-[1.25vw] min-w-[15px] max-w-[21px] fill-white text-white" />
          </div>
          <div className="relative flex-1 space-y-[4.4%] px-[7%] pt-[5%] text-[clamp(10px,0.82vw,15px)] font-bold">
            {displayRoomMessages.length === 0 ? (
              <p className="text-white/50">等待房间动态...</p>
            ) : (
              displayRoomMessages.map((message) => (
              <p key={message.id} className="truncate text-white/88">
                <span className={message.tone === 'green' ? 'text-[#42ff96]' : message.tone === 'cyan' ? 'text-[#56e8ff]' : message.tone === 'pink' ? 'text-[#ff7af2]' : 'text-[#ffd560]'}>
                  {message.name}
                </span>
                ：{message.text}
              </p>
              ))
            )}
          </div>
          <div className="relative flex items-center gap-[3%] px-[6%] pb-[5.2%]">
            <div className="flex h-[4.6vh] min-h-[34px] flex-1 items-center gap-[4%] rounded-[8px] border border-white/10 bg-[#050418]/66 px-[5%] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <input
                aria-label="输入消息"
                placeholder="输入消息..."
                className="min-w-0 flex-1 bg-transparent text-[clamp(10px,0.82vw,14px)] font-bold outline-none placeholder:text-white/42"
              />
              <Smile className="h-[1.15vw] max-h-[20px] min-h-[15px] w-[1.15vw] min-w-[15px] max-w-[20px]" />
            </div>
            <button className="flex h-[4.6vh] min-h-[34px] min-w-[62px] shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] bg-[linear-gradient(180deg,#7665ff,#4f3cff)] px-[14px] text-[clamp(10px,0.78vw,14px)] font-black shadow-[0_0_14px_rgba(96,84,255,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-[1px] hover:brightness-110">
              发送
            </button>
          </div>
        </section>
      </aside>

      <section className="absolute left-[25.8%] right-[10.2%] top-[6.8%] z-10 flex flex-col items-center">
        <div className="flex items-center gap-[0.8vw] rounded-[999px] border border-white/18 bg-[#080842]/62 px-[2vw] py-[1.1vh] text-[clamp(18px,2.1vw,31px)] font-black tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(2,5,38,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px] [text-shadow:0_0_10px_#5757ff,0_2px_0_#15106e]">
          <span>房间号：</span>
          <span>{displayRoomCode}</span>
          <button
            type="button"
            aria-label="复制房间号"
            onClick={handleCopyRoomCode}
            className="flex h-[2.3vw] max-h-[31px] min-h-[24px] w-[2.3vw] min-w-[24px] max-w-[31px] items-center justify-center rounded-[6px] text-white/90 transition hover:bg-white/10"
          >
            <Copy className="h-[70%] w-[70%] stroke-[3]" />
          </button>
        </div>
        <p className="mt-[1.6vh] text-[clamp(12px,1.05vw,17px)] font-black tracking-[0.08em] text-[#e9edff]/86 [text-shadow:0_0_8px_#565cff]">
          等待玩家加入，准备后即可开始
        </p>
      </section>

      <button
        type="button"
        onClick={handleLeaveRoom}
        disabled={isLeavingRoom}
        className="absolute right-[3.2%] top-[4.2%] z-30 rounded-[9px] border border-white/18 bg-[#081052]/62 px-[18px] py-[10px] text-[clamp(12px,0.82vw,15px)] font-black text-white/90 shadow-[0_10px_24px_rgba(2,5,38,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px] transition hover:bg-white/12 disabled:cursor-wait disabled:opacity-60"
      >
        {isLeavingRoom ? '离开中...' : '离开房间'}
      </button>

      <section className="absolute left-[30.4%] right-[6.3%] top-[32.5%] z-20">
        <div className="grid grid-cols-4 gap-[3.5%]">
          {Array.from({ length: visibleSlots }).map((_, index) => {
            const player = displayPlayers[index]
            const disabled = index >= config.maxPlayers

            if (disabled) {
              return <DisabledSlot key={`disabled-${index}`} slot={index + 1} />
            }

            if (!player) {
              return <WaitingSlot key={`waiting-${index}`} slot={index + 1} />
            }

            return <PlayerSlot key={player.id} slot={index + 1} player={player} />
          })}
        </div>
      </section>

      {notice && (
        <div className="absolute bottom-[22.2%] left-[50.4%] z-30 -translate-x-1/2 rounded-full border border-white/18 bg-[#0b1458]/72 px-[1.45vw] py-[0.72vh] text-[clamp(12px,0.88vw,15px)] font-bold text-white/92 shadow-[0_10px_24px_rgba(2,5,38,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[10px]">
          {notice}
        </div>
      )}

      {roomDialog && (
        <RoomDialogModal
          dialog={roomDialog}
          busy={isLeavingRoom}
          onCancel={roomDialog.cancelText ? () => setRoomDialog(null) : undefined}
        />
      )}

      <button
        type="button"
        onClick={handleRoomAction}
        disabled={isUpdatingReady || isStartingMatch}
        className={roomActionButtonClass}
      >
        <span className="relative text-[clamp(22px,2vw,34px)] font-black leading-none tracking-[0.04em] [text-shadow:0_0_12px_rgba(255,255,255,0.34)]">
          {roomActionLabel}
        </span>
        <span className="relative mt-[0.8vh] text-[clamp(11px,0.95vw,16px)] font-black leading-none text-white/82">
          {roomActionHint}
        </span>
      </button>

      <Send className="pointer-events-none absolute bottom-[30.8%] left-[45.8%] h-[2.4vw] max-h-[36px] min-h-[24px] w-[2.4vw] min-w-[24px] max-w-[36px] rotate-[-22deg] text-[#5057ff]/20" />
    </main>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-[4.1%] flex items-center gap-[0.6vw] text-[clamp(11px,0.92vw,16px)] font-bold">
      <span className="text-white/74">{label}：</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

function RoomDialogModal({
  dialog,
  busy,
  onCancel,
}: {
  dialog: RoomDialog
  busy: boolean
  onCancel?: () => void
}) {
  const isDanger = dialog.tone === 'danger'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#02031d]/72 backdrop-blur-[7px]">
      <section className="relative mt-[42px] h-[42vh] min-h-[378px] w-[55vw] min-w-[720px] max-w-[920px] overflow-visible rounded-[22px] border border-[#356fff] bg-[linear-gradient(180deg,rgba(10,24,139,0.92),rgba(3,10,78,0.96))] px-[6.4vw] pb-[5.2vh] pt-[15.2vh] text-center shadow-[0_28px_80px_rgba(0,0,0,0.48),0_0_34px_rgba(54,93,255,0.56),inset_0_1px_0_rgba(120,180,255,0.34)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
          <div className="absolute inset-x-[3%] bottom-[-22%] h-[46%] rounded-[50%] border border-[#2d6fff]/32 shadow-[0_0_35px_rgba(45,91,255,0.28)]" />
          <div className="absolute inset-x-[11%] bottom-[-16%] h-[36%] rounded-[50%] border border-[#2d6fff]/24" />
          <div className="absolute left-[9%] top-[48%] h-2 w-2 rounded-full bg-white shadow-[0_0_14px_4px_rgba(112,150,255,0.78)]" />
          <div className="absolute right-[13%] top-[64%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_4px_rgba(112,150,255,0.72)]" />
          <div className="absolute left-[29%] top-[15%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_4px_rgba(130,170,255,0.78)]" />
          <Image src="/images/dice.png" alt="" width={128} height={128} className="absolute -left-[2%] top-[47%] h-[92px] w-[92px] rotate-[-18deg] object-contain opacity-18" />
          <Image src="/images/dice.png" alt="" width={142} height={142} className="absolute -right-[2%] top-[33%] h-[112px] w-[112px] rotate-[18deg] object-contain opacity-16" />
        </div>
        <div className="absolute left-1/2 top-0 flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#704cff]/70 bg-[radial-gradient(circle_at_45%_28%,rgba(184,116,255,0.94),rgba(37,52,217,0.92)_52%,rgba(20,215,255,0.82))] shadow-[0_0_28px_rgba(126,67,255,0.88),0_0_42px_rgba(18,207,255,0.42)]">
          <div className="absolute inset-[9px] rounded-full border border-white/16 bg-[#1d21a4]/40" />
          <Image src="/images/logo-dice.png" alt="" width={82} height={82} className="relative h-[76px] w-[76px] object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.55)]" />
        </div>
        <div className="relative mx-auto mb-[22px] flex items-center justify-center gap-[22px]">
          <span className="h-px w-[150px] bg-[linear-gradient(90deg,transparent,#5d72ff)]" />
          <span className="text-[28px] text-[#6e8cff] [text-shadow:0_0_14px_rgba(120,150,255,0.9)]">◆</span>
          <h2 className="text-[clamp(34px,2.55vw,46px)] font-black tracking-[0.06em] text-white [text-shadow:0_0_12px_rgba(98,110,255,0.85)]">
            {dialog.title}
          </h2>
          <span className="text-[28px] text-[#6e8cff] [text-shadow:0_0_14px_rgba(120,150,255,0.9)]">◆</span>
          <span className="h-px w-[150px] bg-[linear-gradient(90deg,#5d72ff,transparent)]" />
        </div>
        <p className="relative mx-auto max-w-[560px] text-[clamp(20px,1.6vw,30px)] font-bold leading-[1.75] text-white [text-shadow:0_0_10px_rgba(68,90,255,0.42)]">
          {dialog.message.includes('自动解散') ? (
            <>
              {dialog.message.split('自动解散')[0]}
              <span className="font-black text-[#ffd322]">自动解散</span>
              {dialog.message.split('自动解散')[1]}
            </>
          ) : dialog.message}
        </p>
        <div className="relative mt-[6.5vh] flex justify-center gap-[5.5vw]">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-[74px] min-w-[216px] rounded-[14px] border border-[#4262ff] bg-[linear-gradient(180deg,rgba(14,23,111,0.86),rgba(8,12,76,0.92))] px-8 text-[clamp(22px,1.7vw,32px)] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_18px_rgba(57,84,255,0.24)] transition hover:-translate-y-[1px] hover:border-[#7891ff] disabled:cursor-wait disabled:opacity-60"
            >
              {dialog.cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={dialog.onConfirm}
            disabled={busy}
            className={`h-[74px] min-w-[226px] rounded-[14px] border px-8 text-[clamp(22px,1.7vw,32px)] font-black text-white transition hover:-translate-y-[1px] hover:brightness-110 disabled:cursor-wait disabled:opacity-60 ${isDanger ? 'border-[#66eaff] bg-[linear-gradient(135deg,#b33dff,#1269ff_62%,#18dfff)] shadow-[0_0_24px_rgba(88,134,255,0.65),inset_0_1px_0_rgba(255,255,255,0.24)]' : 'border-[#66eaff] bg-[linear-gradient(135deg,#6f43ff,#1273ff_62%,#18dfff)] shadow-[0_0_24px_rgba(88,134,255,0.62),inset_0_1px_0_rgba(255,255,255,0.24)]'}`}
          >
            {busy ? '处理中...' : dialog.confirmText}
          </button>
        </div>
      </section>
    </div>
  )

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#02031d]/62 backdrop-blur-[3px]">
      <section className="relative w-[31vw] min-w-[360px] max-w-[520px] overflow-hidden rounded-[14px] border border-white/22 bg-[linear-gradient(180deg,rgba(48,58,182,0.9),rgba(8,12,70,0.94))] px-[34px] py-[28px] text-center shadow-[0_24px_60px_rgba(0,0,0,0.42),0_0_28px_rgba(94,105,255,0.28),inset_0_1px_0_rgba(255,255,255,0.18)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),transparent)]" />
        <div className={`relative mx-auto mb-5 flex h-[54px] w-[54px] items-center justify-center rounded-full border ${isDanger ? 'border-[#ffd765]/60 bg-[#7c352c]/58 text-[#ffe36a]' : 'border-[#70f6ff]/60 bg-[#173e8a]/58 text-[#7af8ff]'} text-[28px] font-black shadow-[0_0_20px_rgba(104,123,255,0.38)]`}>
          {isDanger ? '!' : 'i'}
        </div>
        <h2 className="relative text-[24px] font-black tracking-[0.04em] text-white [text-shadow:0_0_10px_rgba(98,110,255,0.75)]">
          {dialog.title}
        </h2>
        <p className="relative mx-auto mt-4 max-w-[380px] text-[15px] font-bold leading-7 text-white/78">
          {dialog.message}
        </p>
        <div className="relative mt-7 flex justify-center gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-[42px] min-w-[112px] rounded-[9px] border border-white/18 bg-white/10 px-5 text-[14px] font-black text-white/88 transition hover:bg-white/16 disabled:cursor-wait disabled:opacity-60"
            >
              {dialog.cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={dialog.onConfirm}
            disabled={busy}
            className={`h-[42px] min-w-[124px] rounded-[9px] px-5 text-[14px] font-black transition hover:-translate-y-[1px] hover:brightness-110 disabled:cursor-wait disabled:opacity-60 ${isDanger ? 'bg-[linear-gradient(180deg,#ffe36c,#ffb21f)] text-[#120d42] shadow-[0_0_18px_rgba(255,204,54,0.42)]' : 'bg-[linear-gradient(180deg,#5ff1ff,#357dff)] text-[#061052] shadow-[0_0_18px_rgba(55,220,255,0.35)]'}`}
          >
            {busy ? '处理中...' : dialog.confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}

function PlayerSlot({ slot, player }: { slot: number; player: Player }) {
  return (
    <article className={slotShellClass()}>
      <SlotNumber slot={slot} />
      <div className="relative mt-[25%] h-[5.8vw] max-h-[86px] min-h-[70px] w-[5.8vw] min-w-[70px] max-w-[86px] rounded-full border-[3px] border-[#78f3ff] bg-[#06145b] shadow-[0_0_22px_rgba(88,131,255,0.62)]">
        {player.avatar ? (
          <Image src={player.avatar} alt={player.name} fill sizes="86px" className="rounded-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,#ffcf4a,#23135e_72%)] text-[clamp(22px,2vw,34px)] font-black">
            {player.emoji}
          </div>
        )}
      </div>
      <h3 className="mt-[6%] max-w-[82%] truncate text-[clamp(12px,1.08vw,18px)] font-black text-white [text-shadow:0_0_7px_rgba(100,135,255,0.9)]">{player.name}</h3>
      {player.isHost && (
        <div className="mt-[6%] rounded-[5px] bg-[#673dff] px-[12%] py-[2.3%] text-[clamp(10px,0.78vw,13px)] font-black shadow-[0_0_10px_rgba(109,72,255,0.7)]">
          房主
        </div>
      )}
      <div className="flex-1" />
      {player.ready ? (
        <div className="mb-[14%] flex items-center gap-[0.42vw] text-[clamp(11px,0.95vw,16px)] font-black text-[#18ffef]">
          <Check className="h-[1.2vw] max-h-[18px] min-h-[14px] w-[1.2vw] min-w-[14px] max-w-[18px] rounded-full bg-[#18ffef] p-[2px] text-[#07105b] stroke-[4]" />
          已准备
        </div>
      ) : (
        <div className="mb-[14%] rounded-[6px] bg-[#5847ff] px-[13%] py-[5%] text-[clamp(11px,0.95vw,16px)] font-black shadow-[0_0_13px_rgba(98,84,255,0.7)]">
          未准备
        </div>
      )}
    </article>
  )
}

function WaitingSlot({ slot }: { slot: number }) {
  return (
    <article className={slotShellClass(true)}>
      <SlotNumber slot={slot} />
      <div className="mt-[31%] flex h-[6vw] max-h-[90px] min-h-[76px] w-[6vw] min-w-[76px] max-w-[90px] items-center justify-center rounded-full border border-white/10 bg-[#4b4cff]/35 shadow-[0_0_24px_rgba(126,116,255,0.42),inset_0_0_20px_rgba(255,255,255,0.12)]">
        <Plus className="h-[61%] w-[61%] stroke-[4.5] text-white" />
      </div>
      <div className="flex-1" />
      <p className="mb-[27%] text-[clamp(11px,0.92vw,16px)] font-black text-white/88">等待玩家加入</p>
    </article>
  )
}

function DisabledSlot({ slot }: { slot: number }) {
  return (
    <article className="relative flex h-[40.5vh] min-h-[256px] flex-col items-center overflow-hidden rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(47,48,140,0.36),rgba(4,7,42,0.66))] opacity-75 shadow-[0_0_13px_rgba(64,63,255,0.18),inset_0_0_22px_rgba(117,105,255,0.1)]">
      <SlotNumber slot={slot} muted />
      <div className="mt-[31%] flex h-[6vw] max-h-[90px] min-h-[76px] w-[6vw] min-w-[76px] max-w-[90px] items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Ban className="h-[60%] w-[60%] text-white/55" />
      </div>
      <div className="flex-1" />
      <p className="mb-[27%] text-[clamp(11px,0.92vw,16px)] font-black text-white/42">不可加入</p>
    </article>
  )
}

function SlotNumber({ slot, muted = false }: { slot: number; muted?: boolean }) {
  return (
    <div className={`absolute left-1/2 top-[4.3%] flex aspect-square h-[2vw] max-h-[29px] min-h-[23px] -translate-x-1/2 items-center justify-center rounded-full text-[clamp(12px,1.05vw,17px)] font-black shadow-[0_2px_7px_rgba(0,0,0,0.45)] ${muted ? 'bg-[#1d2368] text-white/58' : 'bg-[#1a237d] text-white'}`}>
      {slot}
    </div>
  )
}

function slotShellClass(empty = false) {
  return `relative flex h-[40.5vh] min-h-[256px] flex-col items-center overflow-hidden rounded-[12px] border border-[#667dff]/58 bg-[linear-gradient(180deg,rgba(108,99,255,0.66),rgba(9,11,73,0.86))] shadow-[0_0_18px_rgba(75,100,255,0.56),inset_0_0_27px_rgba(111,101,255,0.34)] ${empty ? 'cursor-pointer transition hover:brightness-110' : ''}`
}
