import { AUTH_TOKEN_STORAGE_KEY } from '@/services/api'
import { getRoomAuthTokenStorageKey, getRoomSnapshotStorageKey } from '@/services/room'

// 大厅模式到后端 game_mode 和最大人数的映射。
export const roomModeConfig: Record<string, { gameMode: string; apiGameMode: number; maxPlayers: number }> = {
  'solo-2p': { gameMode: 'solo-2p', apiGameMode: 1, maxPlayers: 2 },
  'solo-3p': { gameMode: 'solo-3p', apiGameMode: 2, maxPlayers: 3 },
  'solo-4p': { gameMode: 'solo-4p', apiGameMode: 3, maxPlayers: 4 },
  'team-2v2': { gameMode: 'team-2v2', apiGameMode: 4, maxPlayers: 4 },
}

// 后端数字 game_mode 到前端路由 mode 的映射。
export const apiGameModeRouteMap: Record<number, string> = {
  1: 'solo-2p',
  2: 'solo-3p',
  3: 'solo-4p',
  4: 'team-2v2',
}

// 保存房间快照和进入房间所需 token，供房间页和 VS/对局页恢复上下文。
export function storeRoomSession(roomId: string | number, room: unknown) {
  window.sessionStorage.setItem(getRoomSnapshotStorageKey(roomId), JSON.stringify(room))

  const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (authToken) {
    window.sessionStorage.setItem(getRoomAuthTokenStorageKey(roomId), authToken)
  }
}
