import type { MatchInfoPlayer } from '@/services/match'
import { normalizeAvatarSrc } from '@/utils/avatar'
import type { Player } from '../components/VsView'

interface CurrentVsUser {
  id: number
  nickname: string
  avatar?: string | null
  exp?: number
  max_score?: number
  highest_score?: number
  total_wins?: number
  win_count?: number
  wins?: number
  total_games?: number
  game_count?: number
}

function getCurrentUserDisplay(user: CurrentVsUser) {
  const totalWins = user.total_wins ?? user.win_count ?? user.wins ?? 0
  const totalGames = user.total_games ?? user.game_count ?? 0

  return {
    name: user.nickname,
    avatar: normalizeAvatarSrc(user.avatar),
    level: Math.floor((user.exp ?? 0) / 200) + 1,
    bestScore: user.max_score ?? user.highest_score ?? 0,
    wins: totalWins,
    rate: `${(totalGames > 0 ? (totalWins / totalGames) * 100 : 0).toFixed(1)}%`,
  }
}

// 将后端玩家信息转换为 VS 页展示玩家。
export function normalizeMatchPlayer(player: MatchInfoPlayer): Player {
  return {
    id: player.user_id,
    name: player.nickname,
    avatar: normalizeAvatarSrc(player.avatar),
    level: player.exp ?? 0,
    title: player.team_id ? `T${player.team_id}` : undefined,
    bestScore: 0,
    wins: 0,
    rate: '0.0%',
  }
}

// 生成 VS 页玩家列表，缺少快照时用当前用户做 fallback。
export function buildVsDisplayPlayers(matchPlayers: Player[], currentUser: CurrentVsUser | null) {
  if (matchPlayers.length > 0) {
    return matchPlayers.map((player) =>
      player.id === currentUser?.id
        ? { ...player, ...getCurrentUserDisplay(currentUser) }
        : player,
    )
  }
  if (!currentUser) return []

  return [
    {
      id: currentUser.id,
      ...getCurrentUserDisplay(currentUser),
    },
  ]
}
