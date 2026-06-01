import { createApiClient } from './api'

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

export function getRoomSnapshotStorageKey(roomId: string | number) {
  return `${ROOM_SNAPSHOT_STORAGE_PREFIX}${roomId}`
}

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

interface ApiEnvelope<T> {
  code: number
  msg?: string
  data: T
}

function unwrapApiData<T>(response: T | ApiEnvelope<T>) {
  if (response && typeof response === 'object' && 'code' in response && 'data' in response) {
    const envelope = response as ApiEnvelope<T>
    if (envelope.code !== 0 && envelope.code !== 200) {
      throw new Error(envelope.msg || '请求失败')
    }

    return envelope.data
  }

  return response as T
}

export async function createRoom(payload: CreateRoomRequest) {
  const { data } = await roomClient.post<CreateRoomResponse | ApiEnvelope<CreateRoomResponse>>('/api/room/create', payload)
  return unwrapApiData(data)
}

export async function joinRoom(payload: JoinRoomRequest) {
  const { data } = await roomClient.post<RoomInfo | ApiEnvelope<RoomInfo>>('/api/room/join', payload)
  return unwrapApiData(data)
}

export async function leaveRoom(payload: LeaveRoomRequest) {
  const { data } = await roomClient.post<LeaveRoomResponse | ApiEnvelope<LeaveRoomResponse | null>>('/api/room/leave', payload)
  return unwrapApiData(data)
}

export async function updatePlayerReady(payload: UpdatePlayerReadyRequest) {
  const { data } = await roomClient.post<UpdatePlayerReadyResponse | null | ApiEnvelope<UpdatePlayerReadyResponse | null>>('/api/room/player/ready', payload)
  return unwrapApiData(data)
}
