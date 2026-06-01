import { API_BASE_URL, AUTH_TOKEN_STORAGE_KEY } from '@/services/api'
import { normalizeAvatarSrc } from '@/utils/avatar'

export type RoomMessageTone = 'green' | 'cyan' | 'pink' | 'gold'

export interface RoomChannelPlayer {
  id: number
  name: string
  avatar?: string
  ready: boolean
  seatNo?: number
  isHost?: boolean
}

export interface RoomChannelPlayerPatch {
  id: number
  name?: string
  avatar?: string
  ready?: boolean
  seatNo?: number
  isHost?: boolean
}

export interface RoomChannelNotice {
  id: string
  name: string
  text: string
  tone: RoomMessageTone
}

export interface RoomChannelEvent {
  players?: RoomChannelPlayer[]
  player?: RoomChannelPlayerPatch
  playerAction?: 'join' | 'leave' | 'ready'
  matchId?: string
  matchInfo?: UnknownRecord[]
  notice?: RoomChannelNotice
  roomClosed?: boolean
  rawType?: string
}

interface ConnectRoomChannelOptions {
  roomId: string
  authToken?: string
  onMessage: (event: RoomChannelEvent) => void
  onOpen?: () => void
  onError?: () => void
  onClose?: () => void
}

type UnknownRecord = Record<string, unknown>

const PLAYER_ID_KEYS = ['user_id', 'changed_user_id', 'player_id', 'userId', 'changedUserId', 'playerId', 'id']
const PLAYER_NAME_KEYS = ['nickname', 'nick_name', 'name', 'username']
const READY_KEYS = ['ready_status', 'readyStatus', 'is_ready', 'isReady', 'ready']
const SEAT_KEYS = ['seat_no', 'seatNo', 'seat', 'position']
const HOST_KEYS = ['is_host', 'isHost', 'host']
const PLAYERS_KEYS = ['players', 'player_list', 'playerList', 'users', 'user_list', 'userList']

function getAuthToken() {
  if (typeof window === 'undefined') return ''

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? ''
}

function buildRoomSocketUrl(roomId: string, authToken?: string) {
  const apiUrl = new URL(API_BASE_URL)
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  apiUrl.pathname = `/ws/room/${encodeURIComponent(roomId)}`
  apiUrl.search = ''

  const token = authToken || getAuthToken()
  if (token) {
    apiUrl.searchParams.set('token', token)
  }

  return apiUrl.toString()
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null
}

function parseRecord(value: unknown): UnknownRecord | null {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value) as unknown)
    } catch {
      return null
    }
  }

  return asRecord(value)
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is UnknownRecord => Boolean(item)) : []
}

function collectRecords(value: unknown, depth = 0): UnknownRecord[] {
  if (depth > 5) return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRecords(item, depth + 1))
  }

  const record = parseRecord(value)
  if (!record) return []

  return [
    record,
    ...Object.values(record).flatMap((item) => collectRecords(item, depth + 1)),
  ]
}

function readFirstRecordArray(records: UnknownRecord[], keys: string[]) {
  for (const record of records) {
    for (const key of keys) {
      const recordArray = asRecordArray(record[key])
      if (recordArray.length > 0) return recordArray
    }
  }

  return []
}

function readNumber(record: UnknownRecord, keys: string[]) {
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

function readNumberFromRecords(records: Array<UnknownRecord | null | undefined>, keys: string[]) {
  for (const record of records) {
    if (!record) continue

    const value = readNumber(record, keys)
    if (value !== undefined) return value
  }

  return undefined
}

function readString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return undefined
}

function readBoolean(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true' || normalized === '1') return true
      if (normalized === 'false' || normalized === '0') return false
    }
  }

  return false
}

function readBooleanFromRecords(records: Array<UnknownRecord | null | undefined>, keys: string[]) {
  for (const record of records) {
    if (!record) continue

    const value = readOptionalBoolean(record, keys)
    if (value !== undefined) return value
  }

  return undefined
}

function readOptionalBoolean(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true' || normalized === '1') return true
      if (normalized === 'false' || normalized === '0') return false
    }
  }

  return undefined
}

function normalizePlayer(player: UnknownRecord, creatorId?: number): RoomChannelPlayer | null {
  const id = readNumber(player, PLAYER_ID_KEYS)
  const name = readString(player, PLAYER_NAME_KEYS)

  if (!id || !name) return null

  return {
    id,
    name,
    avatar: normalizeAvatarSrc(readString(player, ['avatar'])),
    ready: readBoolean(player, READY_KEYS),
    seatNo: readNumber(player, SEAT_KEYS),
    isHost: id === creatorId || readBoolean(player, HOST_KEYS),
  }
}

function normalizePlayerPatch(player: UnknownRecord, creatorId?: number): RoomChannelPlayerPatch | null {
  const id = readNumber(player, PLAYER_ID_KEYS)
  const avatar = readString(player, ['avatar'])
  const isHost = id === creatorId || readBoolean(player, HOST_KEYS)

  if (!id) return null

  return {
    id,
    name: readString(player, PLAYER_NAME_KEYS),
    avatar: avatar ? normalizeAvatarSrc(avatar) : undefined,
    ready: readOptionalBoolean(player, READY_KEYS),
    seatNo: readNumber(player, SEAT_KEYS),
    isHost: isHost ? true : undefined,
  }
}

function mergeRecords(...records: Array<UnknownRecord | null | undefined>) {
  return records.reduce<UnknownRecord>((merged, record) => {
    if (!record) return merged

    return {
      ...merged,
      ...record,
    }
  }, {})
}

function extractReadyPatchFromRecords(records: Array<UnknownRecord | null | undefined>, creatorId?: number) {
  const id = readNumberFromRecords(records, PLAYER_ID_KEYS)
  const ready = readBooleanFromRecords(records, READY_KEYS)

  if (!id || ready === undefined) return null

  return {
    id,
    ready,
    isHost: id === creatorId ? true : undefined,
  }
}

function readEventType(message: UnknownRecord, data?: UnknownRecord) {
  const nestedData = parseRecord(data?.data)
  const nestedPayload = parseRecord(data?.payload)
  const messagePayload = parseRecord(message.payload)

  return (
    readString(message, ['type', 'event', 'action']) ??
    readString(data ?? {}, ['type', 'event', 'action']) ??
    readString(nestedData ?? {}, ['type', 'event', 'action']) ??
    readString(nestedPayload ?? {}, ['type', 'event', 'action']) ??
    readString(messagePayload ?? {}, ['type', 'event', 'action']) ??
    ''
  ).toLowerCase()
}

function isReadyEvent(eventType: string) {
  return eventType === 'player_ready' || eventType.includes('ready')
}

function isRoomClosedEvent(message: UnknownRecord, eventType: string) {
  const data = parseRecord(message.data)
  const nestedData = parseRecord(data?.data)
  const text = [
    eventType,
    readString(message, ['msg', 'message', 'text']),
    readString(data ?? {}, ['msg', 'message', 'text']),
    readString(nestedData ?? {}, ['msg', 'message', 'text']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  // 房间解散可能来自明确事件名，也可能只出现在后端消息文案里。
  return (
    eventType.includes('room_disband') ||
    eventType.includes('room_dismiss') ||
    eventType.includes('room_closed') ||
    eventType.includes('room_close') ||
    eventType.includes('host_leave') ||
    eventType.includes('owner_leave') ||
    text.includes('房主') ||
    text.includes('解散') ||
    text.includes('dissolve') ||
    text.includes('dismiss') ||
    text.includes('closed')
  )
}

function isMatchStartEvent(eventType: string) {
  return (
    eventType.includes('match_start') ||
    eventType.includes('match_started') ||
    eventType.includes('game_start') ||
    eventType.includes('game_started') ||
    eventType.includes('start_match')
  )
}

function extractMatchEvent(message: UnknownRecord) {
  const data = parseRecord(message.data)
  const records = collectRecords(message)
  const eventType = readEventType(message, data ?? undefined)

  if (!isMatchStartEvent(eventType)) return {}

  const matchId = readNumberFromRecords(records, ['match_id', 'matchId', 'id'])
  const matchInfo = readFirstRecordArray(records, ['match_info', 'matchInfo', 'players', 'player_list', 'playerList'])

  return {
    matchId: matchId ? String(matchId) : undefined,
    matchInfo: matchInfo.length > 0 ? matchInfo : undefined,
  }
}

function extractPlayers(message: UnknownRecord) {
  const data = parseRecord(message.data)
  const nestedData = parseRecord(data?.data)
  const messagePayload = parseRecord(message.payload)
  const dataPayload = parseRecord(data?.payload)
  const nestedPayload = parseRecord(nestedData?.payload)
  const records = collectRecords(message)
  const room =
    parseRecord(nestedPayload?.room) ??
    parseRecord(dataPayload?.room) ??
    parseRecord(messagePayload?.room) ??
    parseRecord(nestedData?.room) ??
    parseRecord(data?.room) ??
    parseRecord(message.room)
  const creatorId =
    readNumber(nestedPayload ?? {}, ['creator_id', 'owner_id']) ??
    readNumber(dataPayload ?? {}, ['creator_id', 'owner_id']) ??
    readNumber(messagePayload ?? {}, ['creator_id', 'owner_id']) ??
    readNumber(nestedData ?? {}, ['creator_id', 'owner_id']) ??
    readNumber(data ?? {}, ['creator_id', 'owner_id']) ??
    readNumber(message, ['creator_id', 'owner_id']) ??
    readNumber(room ?? {}, ['creator_id', 'owner_id'])
  const playerRecords =
    asRecordArray(nestedPayload?.players).length > 0
      ? asRecordArray(nestedPayload?.players)
      : asRecordArray(dataPayload?.players).length > 0
        ? asRecordArray(dataPayload?.players)
        : asRecordArray(messagePayload?.players).length > 0
          ? asRecordArray(messagePayload?.players)
          : asRecordArray(nestedData?.players).length > 0
            ? asRecordArray(nestedData?.players)
            : asRecordArray(data?.players).length > 0
              ? asRecordArray(data?.players)
              : asRecordArray(message.players).length > 0
                ? asRecordArray(message.players)
                : asRecordArray(room?.players).length > 0
                  ? asRecordArray(room?.players)
                  : readFirstRecordArray(records, PLAYERS_KEYS)

  const players = playerRecords
    .map((player) => normalizePlayer(player, creatorId))
    .filter((player): player is RoomChannelPlayer => Boolean(player))

  return players.length > 0
    ? players.sort((playerA, playerB) => (playerA.seatNo ?? Number.MAX_SAFE_INTEGER) - (playerB.seatNo ?? Number.MAX_SAFE_INTEGER))
    : undefined
}

function extractPlayerEvent(message: UnknownRecord) {
  const data = parseRecord(message.data)
  const nestedData = parseRecord(data?.data)
  const messagePayload = parseRecord(message.payload)
  const dataPayload = parseRecord(data?.payload)
  const nestedPayload = parseRecord(nestedData?.payload)
  const room = parseRecord(nestedData?.room) ?? parseRecord(data?.room) ?? parseRecord(message.room)
  const creatorId =
    readNumber(nestedData ?? {}, ['creator_id', 'owner_id']) ??
    readNumber(data ?? {}, ['creator_id', 'owner_id']) ??
    readNumber(message, ['creator_id', 'owner_id']) ??
    readNumber(room ?? {}, ['creator_id', 'owner_id'])
  const eventType = readEventType(message, data ?? undefined)
  const nestedUser = parseRecord(nestedData?.user) ?? parseRecord(nestedData?.player)
  const dataUser = parseRecord(data?.user) ?? parseRecord(data?.player)
  const messageUser = parseRecord(message.user) ?? parseRecord(message.player)
  const records = [message, messagePayload, data, dataPayload, nestedData, nestedPayload, messageUser, dataUser, nestedUser]
  const allRecords = [...records, ...collectRecords(message)]
  const user = mergeRecords(...records)
  const player = user ? normalizePlayerPatch(user, creatorId) : null

  if (!player) return {}

  // 后端不同字段可能使用 join/enter 表示进入房间。
  if (eventType.includes('join') || eventType.includes('enter')) {
    if (!player.name) return {}

    return { player, playerAction: 'join' as const }
  }

  // 后端不同字段可能使用 leave/exit 表示离开房间。
  if (eventType.includes('leave') || eventType.includes('exit')) {
    return { player, playerAction: 'leave' as const }
  }

  // 准备状态可能是显式 ready 事件，也可能只带 ready_status 字段。
  if (isReadyEvent(eventType)) {
    const readyPatch = extractReadyPatchFromRecords(allRecords, creatorId)

    if (readyPatch) {
      return { player: readyPatch, playerAction: 'ready' as const }
    }

    return { player, playerAction: 'ready' as const }
  }

  const readyPatch = extractReadyPatchFromRecords(allRecords, creatorId)
  if (readyPatch) {
    return { player: readyPatch, playerAction: 'ready' as const }
  }

  return {}
}

function extractNotice(message: UnknownRecord): RoomChannelNotice | undefined {
  const data = parseRecord(message.data)
  const nestedData = parseRecord(data?.data)
  const eventType = readEventType(message, data ?? undefined)
  const user =
    parseRecord(nestedData?.user) ??
    parseRecord(nestedData?.player) ??
    nestedData ??
    parseRecord(data?.user) ??
    parseRecord(data?.player) ??
    parseRecord(message.user) ??
    parseRecord(message.player) ??
    data ??
    message
  const name = readString(user, ['nickname', 'name', 'username'])
  const text =
    readString(nestedData ?? {}, ['text', 'message', 'msg']) ??
    readString(data ?? {}, ['text', 'message', 'msg']) ??
    readString(message, ['text', 'message', 'msg'])

  if (eventType.includes('join') || eventType.includes('enter')) {
    return createNotice(name ?? '玩家', '进入房间', 'cyan')
  }

  if (eventType.includes('leave') || eventType.includes('exit')) {
    return createNotice(name ?? '玩家', '离开房间', 'gold')
  }

  if (isReadyEvent(eventType)) {
    const ready = readBooleanFromRecords([data, user], READY_KEYS) ?? false
    return createNotice(name ?? '玩家', ready ? '已准备' : '取消准备', 'green')
  }

  if ((eventType.includes('chat') || eventType.includes('message')) && name && text) {
    return createNotice(name, text, 'pink')
  }

  return undefined
}

function createNotice(name: string, text: string, tone: RoomMessageTone): RoomChannelNotice {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    text,
    tone,
  }
}

function parseRoomMessage(rawMessage: string): RoomChannelEvent {
  const parsed = JSON.parse(rawMessage) as unknown
  const message = asRecord(parsed)

  if (!message) return {}
  const playerEvent = extractPlayerEvent(message)
  const matchEvent = extractMatchEvent(message)
  const rawType = readEventType(message, asRecord(message.data) ?? undefined)

  // 将后端原始广播规整成页面只关心的房间事件结构。
  return {
    rawType,
    players: extractPlayers(message),
    ...playerEvent,
    ...matchEvent,
    notice: extractNotice(message),
    roomClosed: isRoomClosedEvent(message, rawType),
  }
}

export function connectRoomChannel({
  roomId,
  authToken,
  onMessage,
  onOpen,
  onError,
  onClose,
}: ConnectRoomChannelOptions) {
  const socket = new WebSocket(buildRoomSocketUrl(roomId, authToken))
  let disposed = false

  socket.addEventListener('open', () => {
    if (disposed) {
      socket.close()
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[room websocket open]', socket.url)
    }
    onOpen?.()
  })
  socket.addEventListener('error', () => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[room websocket error]', socket.url)
    }
    if (!disposed) onError?.()
  })
  socket.addEventListener('close', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[room websocket close]', socket.url)
    }
    if (!disposed) onClose?.()
  })
  socket.addEventListener('message', async (event) => {
    if (disposed) return

    // 浏览器 WebSocket 可能收到 string 或 Blob，这里统一转成字符串再解析。
    const rawMessage = typeof event.data === 'string' ? event.data : event.data instanceof Blob ? await event.data.text() : ''
    if (disposed || !rawMessage) return

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[room websocket message]', rawMessage)
      }
      const parsedMessage = parseRoomMessage(rawMessage)
      if (process.env.NODE_ENV === 'development') {
        console.log('[room websocket parsed]', parsedMessage)
      }
      onMessage(parsedMessage)
    } catch {
      onError?.()
    }
  })

  return () => {
    disposed = true

    if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
      socket.close()
    }
  }
}
