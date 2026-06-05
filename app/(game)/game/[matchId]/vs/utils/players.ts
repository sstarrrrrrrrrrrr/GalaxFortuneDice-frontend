import type { MatchInfoPlayer } from '@/services/match'
import { normalizeAvatarSrc } from '@/utils/avatar'
import type { Player } from '../components/VsView'

interface CurrentVsUser {
  id: number
  nickname: string
  avatar?: string | null
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
  if (matchPlayers.length > 0) return matchPlayers
  if (!currentUser) return []

  return [
    {
      id: currentUser.id,
      name: currentUser.nickname,
      avatar: normalizeAvatarSrc(currentUser.avatar),
      level: 0,
      bestScore: 0,
      wins: 0,
      rate: '0.0%',
    },
  ]
}
