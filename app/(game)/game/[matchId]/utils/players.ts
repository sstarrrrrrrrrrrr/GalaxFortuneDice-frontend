import type { MatchInfoPlayer, MatchSnapshot } from '@/services/match'
import { normalizeAvatarSrc } from '@/utils/avatar'
import type { GamePlayer as Player } from '../components/GamePanels'

interface HydratedGameUser {
  id: number
  nickname?: string
  avatar?: string | null
}

// 将后端玩家信息转换为对局页展示玩家。
function normalizeMatchPlayer(player: MatchInfoPlayer, currentTurnUserId?: number): Player {
  return {
    id: player.user_id,
    name: player.nickname,
    avatar: normalizeAvatarSrc(player.avatar),
    score: 0,
    isCurrentTurn: player.user_id === currentTurnUserId,
    team: player.team_id === 2 ? 'red' : 'blue',
  }
}

// 生成对局页展示玩家列表，优先使用后端快照，缺省时使用本地占位玩家。
export function buildDisplayPlayers(
  matchSnapshot: MatchSnapshot | null,
  fallbackPlayers: Player[],
  hydratedUser: HydratedGameUser | null,
) {
  if (matchSnapshot?.players.length) {
    return matchSnapshot.players.map((player) => {
      const displayPlayer = normalizeMatchPlayer(player, matchSnapshot.currentTurnUserId)
      if (player.user_id !== hydratedUser?.id) return displayPlayer

      return {
        ...displayPlayer,
        name: hydratedUser.nickname ?? displayPlayer.name,
        avatar: normalizeAvatarSrc(hydratedUser.avatar || displayPlayer.avatar),
      }
    })
  }

  return fallbackPlayers.map((player) =>
    player.id === 1
      ? {
          ...player,
          name: hydratedUser?.nickname ?? player.name,
          avatar: hydratedUser?.avatar || player.avatar,
        }
      : player,
  )
}

// 找到当前回合玩家，找不到时回退第一个玩家。
export function findCurrentPlayer(displayPlayers: Player[]) {
  return displayPlayers.find((player) => player.isCurrentTurn) ?? displayPlayers[0]
}

// 判断当前登录用户是否轮到操作。
export function isCurrentPlayerTurn(currentUserId: number | undefined, currentPlayer: Player | undefined) {
  return Boolean(currentUserId && currentPlayer?.id === currentUserId)
}

// 根据模式人数截取当前需要展示的玩家。
export function getVisiblePlayers(displayPlayers: Player[], maxPlayers: number) {
  return displayPlayers.slice(0, maxPlayers)
}
