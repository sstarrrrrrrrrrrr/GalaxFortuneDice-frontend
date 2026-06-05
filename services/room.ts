import { createApiClient } from './api'
import { unwrapApiData, type ApiEnvelope } from './shared'

const roomClient = createApiClient()

export interface CreateRoomRequest {
  game_mode: number
  max_players: number
  user_id: number
}

export interface CreateRoomResponse {
  room_id: number | string
  game_mode: number
  current_players: number
  max_players: number
  creator_id: number
  room_status: number
  players?: RoomUserInfo[]
}

export interface JoinRoomRequest {
  room_id: number
  user_id: number
}

export interface RoomUserInfo {
  id?: number
  user_id?: number
  phone?: string | null
  nickname?: string
  avatar?: string
  exp?: number
  team_id?: number
  seat_no?: number
  ready_status?: boolean
  is_online?: boolean
}

export interface RoomInfo {
  room_id: string | number
  game_mode: string | number
  max_players: number
  owner_id?: number
  creator_id?: number
  status?: string
  room_status?: number
  current_players?: number
  players?: RoomUserInfo[]
}

export const ROOM_SNAPSHOT_STORAGE_PREFIX = 'galax_room_snapshot:'
export const ROOM_AUTH_TOKEN_STORAGE_PREFIX = 'galax_room_auth_token:'

// 生成房间快照的 sessionStorage key。
export function getRoomSnapshotStorageKey(roomId: string | number) {
  return `${ROOM_SNAPSHOT_STORAGE_PREFIX}${roomId}`
}

// 生成房间专属 token 的 sessionStorage key。
export function getRoomAuthTokenStorageKey(roomId: string | number) {
  return `${ROOM_AUTH_TOKEN_STORAGE_PREFIX}${roomId}`
}

export interface LeaveRoomRequest {
  room_id: string | number
  user_id: number
}

export interface LeaveRoomResponse {
  message?: string
  msg?: string
  data?: null
}

export interface UpdatePlayerReadyRequest {
  room_id: string | number
  user_id: number
  ready_status: boolean
}

export interface UpdatePlayerReadyResponse {
  message?: string
  room?: RoomInfo
  players?: RoomUserInfo[]
  player?: RoomUserInfo
  user?: RoomUserInfo
  user_id?: number
  ready_status?: boolean
}

// 调用创建房间接口，返回标准化后的房间信息。
export async function createRoom(payload: CreateRoomRequest) {
  const { data } = await roomClient.post<CreateRoomResponse | ApiEnvelope<CreateRoomResponse>>('/api/room/create', payload)
  return unwrapApiData(data)
}

// 调用加入房间接口，返回房间详情。
export async function joinRoom(payload: JoinRoomRequest) {
  const { data } = await roomClient.post<RoomInfo | ApiEnvelope<RoomInfo>>('/api/room/join', payload)
  return unwrapApiData(data)
}

// 调用离开房间接口，通知后端同步房间成员状态。
export async function leaveRoom(payload: LeaveRoomRequest) {
  const { data } = await roomClient.post<LeaveRoomResponse | ApiEnvelope<LeaveRoomResponse | null>>('/api/room/leave', payload)
  return unwrapApiData(data)
}

// 调用准备状态接口，切换玩家 ready_status。
export async function updatePlayerReady(payload: UpdatePlayerReadyRequest) {
  const { data } = await roomClient.post<UpdatePlayerReadyResponse | null | ApiEnvelope<UpdatePlayerReadyResponse | null>>('/api/room/player/ready', payload)
  return unwrapApiData(data)
}
