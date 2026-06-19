import type { MatchInfoPlayer } from '@/services/match'
import { getRoomSnapshotStorageKey, type RoomInfo, type RoomUserInfo, type UpdatePlayerReadyResponse } from '@/services/room'
import { normalizeAvatarSrc } from '@/utils/avatar'
import type { RoomChannelPlayerPatch } from '@/websocket/room'
import type { RoomPlayer as Player } from '../components/RoomView'

interface HydratedRoomUser {
  nickname?: string
  avatar?: string | null
}

// 根据本地用户、占位玩家和房主信息生成房间展示玩家列表。
export function buildDisplayRoomPlayers({
  players,
  currentPlayerId,
  placeholderPlayerId,
  hydratedUser,
  isHostView,
  creatorId,
}: {
  players: Player[]
  currentPlayerId: number
  placeholderPlayerId: number
  hydratedUser: HydratedRoomUser | null
  isHostView: boolean
  creatorId?: number
}) {
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

    if (player.id === currentPlayerId && hydratedUser) {
      return {
        ...player,
        name: hydratedUser.nickname ?? player.name,
        avatar: normalizeAvatarSrc(hydratedUser.avatar || player.avatar),
        isHost: player.isHost || isHostView || player.id === creatorId,
      }
    }

    if (player.id === creatorId) {
      return { ...player, isHost: true }
    }

    return player
  })
}

// 将后端房间玩家信息转换为 RoomView 可用的玩家结构。
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

// 按座位号排序房间玩家。
function sortRoomPlayers(players: Player[]) {
  return [...players].sort((playerA, playerB) => (playerA.seatNo ?? Number.MAX_SAFE_INTEGER) - (playerB.seatNo ?? Number.MAX_SAFE_INTEGER))
}

// 合并 WebSocket 推送的单个玩家变更。
export function mergeRoomPlayer(currentPlayers: Player[], nextPlayer: RoomChannelPlayerPatch, action?: 'join' | 'leave' | 'ready') {
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

// 合并 sessionStorage 中的房间快照玩家，保留当前本地准备状态。
export function mergeRoomSnapshotPlayers(currentPlayers: Player[], snapshotPlayers: Player[]) {
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

// 从房间快照缓存中读取并规整玩家列表。
export function readStoredRoomPlayers(roomId: string, creatorId?: number) {
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

// 从准备接口响应里读取完整玩家列表。
export function readReadyResponsePlayers(response: UpdatePlayerReadyResponse | null | undefined, creatorId?: number) {
  if (!response) return undefined

  const responseRoom = response.room
  const responsePlayers = responseRoom?.players ?? response.players
  const responseCreatorId = responseRoom?.creator_id ?? responseRoom?.owner_id ?? creatorId

  const players = responsePlayers
    ?.map((player) => normalizeRoomPlayer(player, responseCreatorId))
    .filter((player): player is Player => Boolean(player))

  return players ? sortRoomPlayers(players) : undefined
}

// 从准备接口响应里读取单个玩家 patch，响应为空时用 fallback 补齐。
export function readReadyResponsePlayerPatch(
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

// 应用准备接口响应：完整列表优先，否则合并单玩家 patch。
export function applyReadyResponseToPlayers({
  currentPlayers,
  response,
  fallbackUserId,
  fallbackReadyStatus,
  creatorId,
}: {
  currentPlayers: Player[]
  response: UpdatePlayerReadyResponse | null | undefined
  fallbackUserId: number
  fallbackReadyStatus: boolean
  creatorId?: number
}) {
  const responsePlayers = readReadyResponsePlayers(response, creatorId)

  if (responsePlayers && responsePlayers.length > 0) {
    return responsePlayers
  }

  return mergeRoomPlayer(
    currentPlayers,
    readReadyResponsePlayerPatch(response, fallbackUserId, fallbackReadyStatus, creatorId),
    'ready',
  )
}

// 从 match_info 兼容字段中读取数字。
function readMatchInfoNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return undefined
}

// 从 match_info 兼容字段中读取字符串。
function readMatchInfoString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return undefined
}

// 规整后端 match_info，确保进入对局前玩家字段完整。
export function normalizeMatchInfoPlayers(matchInfo?: Array<Record<string, unknown>>): MatchInfoPlayer[] {
  if (!matchInfo) return []

  return matchInfo.flatMap((player) => {
    const userId = readMatchInfoNumber(player, ['user_id', 'userId', 'player_id', 'playerId', 'id'])
    const nickname = readMatchInfoString(player, ['nickname', 'nick_name', 'name', 'username'])

    if (!userId || !nickname) return []

    return [{
      ...player,
      user_id: userId,
      nickname,
      id: readMatchInfoNumber(player, ['id']) ?? userId,
      avatar: readMatchInfoString(player, ['avatar']),
      team_id: readMatchInfoNumber(player, ['team_id', 'teamId']),
      seat_no: readMatchInfoNumber(player, ['seat_no', 'seatNo', 'seat', 'position']),
      ready_status: Boolean(player.ready_status),
    }]
  })
}
