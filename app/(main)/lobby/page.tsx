'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { createRoom, joinRoom } from '@/services/room'
import { LobbyView, type LobbyStats } from './components/LobbyView'
import { apiGameModeRouteMap, roomModeConfig, storeRoomSession } from './utils/room'

// 大厅页容器，派生玩家展示数据并处理创建/加入房间流程。
export default function LobbyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isGuest = searchParams.get('mode') === 'guest'
  const currentUser = useCurrentUser()
  const [roomIdInput, setRoomIdInput] = useState('')
  const [roomMessage, setRoomMessage] = useState('')
  const [pendingRoomAction, setPendingRoomAction] = useState('')

  const accountExp = currentUser?.exp ?? 0
  const levelBaseExp = 200
  const level = Math.floor(accountExp / levelBaseExp) + 1
  const currentLevelExp = accountExp % levelBaseExp
  const highestScore = currentUser?.highest_score ?? currentUser?.max_score ?? 0
  const winCount = currentUser?.win_count ?? currentUser?.wins ?? 0
  const totalGames = currentUser?.total_games ?? currentUser?.game_count ?? 0
  const winRate = currentUser?.win_rate ?? (totalGames > 0 ? (winCount / totalGames) * 100 : 0)
  const statValues: LobbyStats = {
    highestScore: String(highestScore),
    winCount: String(winCount),
    totalGames: String(totalGames),
    winRate: `${winRate.toFixed(1)}%`,
  }
  const playerName = currentUser?.nickname ?? (isGuest ? '游客玩家' : '未登录玩家')
  const playerAvatar = currentUser?.avatar || '/images/default_avatar.png'
  const playerLevel = `Lv.${level}`
  const playerExp = `${currentLevelExp}/${levelBaseExp}`
  const playerExpPercent = Math.min(100, Math.max(0, (currentLevelExp / levelBaseExp) * 100))

  // 根据玩法入口创建房间，并把后端房间信息写入本地会话后跳转。
  async function handleCreateRoom(href: string) {
    const modeKey = href.replace('/room/', '')
    const config = roomModeConfig[modeKey]

    if (!config) {
      router.push(href)
      return
    }

    try {
      setRoomMessage('')
      setPendingRoomAction(modeKey)

      if (isGuest) {
        const localRoomId = `guest-${currentUser?.id ?? 'local'}`
        router.push(
          `/room/${encodeURIComponent(localRoomId)}?mode=${encodeURIComponent(config.gameMode)}&maxPlayers=${config.maxPlayers}&role=host&guest=true`,
        )
        return
      }

      const room = await createRoom({
        game_mode: config.apiGameMode,
        max_players: config.maxPlayers,
        user_id: currentUser?.id ?? 0,
      })
      const gameMode =
        typeof room.game_mode === 'number'
          ? apiGameModeRouteMap[room.game_mode] ?? config.gameMode
          : config.gameMode
      const maxPlayers = room.max_players || config.maxPlayers
      storeRoomSession(room.room_id, room)

      router.push(
        `/room/${encodeURIComponent(String(room.room_id))}?mode=${encodeURIComponent(gameMode)}&maxPlayers=${maxPlayers}&role=host&creatorId=${room.creator_id}&roomStatus=${room.room_status}`,
      )
    } catch (error) {
      setRoomMessage(error instanceof Error && error.message ? error.message : '创建房间失败，请稍后重试')
    } finally {
      setPendingRoomAction('')
    }
  }

  // 根据输入房间号加入房间，并保持 mode/maxPlayers 等路由参数完整。
  async function handleJoinRoom() {
    if (pendingRoomAction === 'join') return

    const roomId = roomIdInput.trim()
    if (!roomId) {
      setRoomMessage('请输入房间号')
      return
    }
    const numericRoomId = Number(roomId)
    if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
      setRoomMessage('房间号格式不正确')
      return
    }

    try {
      setRoomMessage('')
      setPendingRoomAction('join')

      if (isGuest) {
        router.push(`/room/${encodeURIComponent(roomId)}?mode=solo-2p&maxPlayers=2&role=player&guest=true`)
        return
      }

      const room = await joinRoom({
        room_id: numericRoomId,
        user_id: currentUser?.id ?? 0,
      })
      const gameMode =
        typeof room.game_mode === 'number'
          ? apiGameModeRouteMap[room.game_mode] ?? 'solo-2p'
          : room.game_mode in roomModeConfig
            ? room.game_mode
            : 'solo-2p'
      const maxPlayers = room.max_players || roomModeConfig[gameMode]?.maxPlayers || 2
      storeRoomSession(room.room_id, room)

      router.push(
        `/room/${encodeURIComponent(String(room.room_id))}?mode=${encodeURIComponent(gameMode)}&maxPlayers=${maxPlayers}&role=player&creatorId=${room.creator_id ?? room.owner_id ?? ''}&roomStatus=${room.room_status ?? ''}`,
      )
    } catch (error) {
      setRoomMessage(error instanceof Error && error.message ? error.message : '加入房间失败，请检查房间号')
    } finally {
      setPendingRoomAction('')
    }
  }

  return (
    <LobbyView
      roomIdInput={roomIdInput}
      onRoomIdInputChange={setRoomIdInput}
      onJoinRoom={handleJoinRoom}
      onCreateRoom={handleCreateRoom}
      onQuickAction={(href) => router.push(href)}
      roomMessage={roomMessage}
      pendingRoomAction={pendingRoomAction}
      playerName={playerName}
      playerAvatar={playerAvatar}
      playerLevel={playerLevel}
      playerExp={playerExp}
      playerExpPercent={playerExpPercent}
      stats={statValues}
    />
  )
}
