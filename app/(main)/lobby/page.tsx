'use client'

import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import {
  ChevronRight,
  Dice5,
  Mail,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { AUTH_TOKEN_STORAGE_KEY } from '@/services/api'
import { createRoom, getRoomAuthTokenStorageKey, getRoomSnapshotStorageKey, joinRoom } from '@/services/room'

const statRows = [
  { label: '最高分', key: 'highestScore', icon: Star, color: 'text-[#ffca1f]' },
  { label: '胜场数', key: 'winCount', icon: Trophy, color: 'text-[#2f56ff]' },
  { label: '总场数', key: 'totalGames', icon: Dice5, color: 'text-[#2f56ff]' },
  { label: '胜率', key: 'winRate', icon: Target, color: 'text-[#8b4dff]' },
] as const

const modes = [
  {
    title: '单人挑战',
    image: '/images/home-one.png',
    accent: '#2d70ff',
    options: [
      { label: '2人混战', href: '/room/solo-2p' },
      { label: '3人混战', href: '/room/solo-3p' },
      { label: '4人混战', href: '/room/solo-4p' },
      { label: '更多玩法', disabled: true },
    ],
  },
  {
    title: '团队模式',
    image: '/images/home-two.png',
    accent: '#f5b316',
    options: [
      { label: '2V2', href: '/room/team-2v2' },
      { label: '3V3', disabled: true },
      { label: '4V4', disabled: true },
    ],
  },
  {
    title: '娱乐模式',
    image: '/images/home-three.png',
    accent: '#7a39ff',
    options: [
      { label: '人机对战', disabled: true },
      { label: '敬请期待', disabled: true },
    ],
  },
]

const roomModeConfig: Record<string, { gameMode: string; apiGameMode: number; maxPlayers: number }> = {
  'solo-2p': { gameMode: 'solo-2p', apiGameMode: 1, maxPlayers: 2 },
  'solo-3p': { gameMode: 'solo-3p', apiGameMode: 2, maxPlayers: 3 },
  'solo-4p': { gameMode: 'solo-4p', apiGameMode: 3, maxPlayers: 4 },
  'team-2v2': { gameMode: 'team-2v2', apiGameMode: 4, maxPlayers: 4 },
}

const apiGameModeRouteMap: Record<number, string> = {
  1: 'solo-2p',
  2: 'solo-3p',
  3: 'solo-4p',
  4: 'team-2v2',
}

const quickActions = [
  { title: '榜单', en: 'LEADERBOARD', icon: Trophy, href: '/ranking/overall', meta: '2' },
  { title: '道具', en: 'ITEM', icon: Package, href: '/lobby/modes' },
  { title: '商店', en: 'SHOP', icon: ShoppingBag, href: '/profile/me' },
]

function storeRoomSession(roomId: string | number, room: unknown) {
  window.sessionStorage.setItem(getRoomSnapshotStorageKey(roomId), JSON.stringify(room))

  const authToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (authToken) {
    window.sessionStorage.setItem(getRoomAuthTokenStorageKey(roomId), authToken)
  }
}

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
  const statValues = {
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
  const displayStats = statRows.map((row) => ({ ...row, value: statValues[row.key] }))

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
    <main className="relative h-screen min-h-[620px] w-screen min-w-[1080px] overflow-hidden bg-[#03072c] text-white">
      <Image src="/images/homepage-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,4,28,0.08)_0%,rgba(2,4,28,0.2)_56%,rgba(2,4,28,0.5)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[18vh] bg-[linear-gradient(180deg,rgba(2,6,44,0.72),transparent)]" />

      <header className="absolute left-[2.1%] right-[2.8%] top-[2.6%] z-30 flex items-start justify-between">
        <Image
          src="/images/logo.png"
          alt="银河大乐骰"
          width={316}
          height={95}
          priority
          className="h-[7.4vh] max-h-[96px] min-h-[62px] w-auto object-contain drop-shadow-[0_0_16px_rgba(111,132,255,0.72)]"
        />

        <div className="flex items-start gap-[1.8vw]">
          <div className="flex h-[4.7vh] min-h-[40px] w-[20vw] min-w-[270px] items-center rounded-[10px] border border-[rgba(62,124,255,0.52)] bg-[rgba(4,12,58,0.7)] shadow-[0_0_13px_rgba(39,98,255,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[12px] transition-[border-color,box-shadow,background] duration-300 ease-out focus-within:border-blue-200/70 focus-within:bg-[rgba(29,75,190,0.45)] focus-within:shadow-[0_0_20px_rgba(91,119,255,0.85),inset_0_1px_0_rgba(255,255,255,0.16)]">
            <input
              type="text"
              placeholder="输入房间号"
              value={roomIdInput}
              onChange={(event) => setRoomIdInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleJoinRoom()
                }
              }}
              className="h-full min-w-0 flex-1 bg-transparent px-[6%] text-[clamp(12px,0.78vw,15px)] font-medium text-white outline-none placeholder:text-white/54"
            />
            <button
              type="button"
              aria-label="加入房间"
              onClick={handleJoinRoom}
              disabled={pendingRoomAction === 'join'}
              className="mr-[5px] flex h-[calc(100%-10px)] w-[44px] items-center justify-center rounded-[8px] bg-white/12 text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
            >
              <ChevronRight className="h-[22px] w-[22px] stroke-[3]" />
            </button>
          </div>

          <div className="flex items-center gap-[1.15vw]">
            <IconButton label="邮件">
              <Mail />
            </IconButton>
            <IconButton label="好友">
              <Users />
            </IconButton>
            <IconButton label="设置">
              <Settings />
            </IconButton>
          </div>
        </div>
      </header>

      <aside className="absolute left-[3.1%] top-[19.6%] z-20 w-[16vw] min-w-[214px] overflow-hidden rounded-[14px] border border-white/14 bg-[#070b4d]/64 shadow-[0_18px_36px_rgba(2,5,42,0.34)] backdrop-blur-[12px] transition duration-300 hover:-translate-y-[4px] hover:border-white/26 hover:shadow-[0_22px_42px_rgba(2,5,42,0.42),0_0_24px_rgba(111,132,255,0.26)]">
        <div className="flex h-[46px] items-center justify-center border-b border-white/10 bg-white/6 text-[clamp(13px,0.9vw,17px)] font-black">
          个人信息
        </div>
        <div className="relative flex h-[19vh] min-h-[150px] flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(119,106,255,0.42),transparent_62%)]" />
          <div className="relative aspect-square h-[42%] min-h-[70px] rounded-full border-[3px] border-white/86 bg-[#20137e] shadow-[0_0_20px_rgba(142,151,255,0.62)]">
            <Image src={playerAvatar} alt="玩家头像" fill sizes="9vw" className="rounded-full object-cover" />
          </div>
          <div className="relative mt-[12px] max-w-[86%] truncate text-[clamp(13px,0.95vw,18px)] font-black">
            {playerName}
          </div>
          <div className="relative mt-[4px] text-[clamp(11px,0.74vw,14px)] font-semibold text-white/68">
            {playerLevel}
          </div>
        </div>
        <div className="grid border-t border-white/10 bg-white/92 px-[8%] py-[6%] text-[#080b4d]">
          {displayStats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex min-h-[38px] items-center justify-between border-b border-[#d8dcf2] last:border-b-0">
              <span className="text-[clamp(11px,0.78vw,15px)] font-bold">{label}</span>
              <span className="flex items-center gap-[6px] text-[clamp(12px,0.82vw,16px)] font-black">
                {value}
                <Icon className={`h-[15px] w-[15px] ${color}`} fill="currentColor" />
              </span>
            </div>
          ))}
        </div>
      </aside>

      <section className="absolute left-[38.2%] top-[23%] z-10 h-[47.5vh] w-[50.8%]">
        <div className="grid h-full grid-cols-3 gap-[1.1vw]">
          {modes.map((mode, index) => (
            <div
              key={mode.title}
              className="lobby-mode-float group relative h-full min-w-0 overflow-hidden rounded-[14px]"
              style={{ animationDelay: `${index * 0.3}s` }}
            >
              <button
                type="button"
                className="relative h-full w-full overflow-hidden rounded-[14px] text-left outline-none transition duration-300 group-hover:-translate-y-[1.2%] group-focus-visible:-translate-y-[1.2%]"
                aria-label={mode.title}
              >
                <span
                  className="absolute inset-0 rounded-[14px] opacity-0 blur-[18px] transition duration-300 group-hover:opacity-70 group-focus-visible:opacity-70"
                  style={{ backgroundColor: mode.accent }}
                />
                <Image
                  src={mode.image}
                  alt={mode.title}
                  fill
                  sizes="24vw"
                  className="rounded-[14px] object-cover shadow-[0_18px_36px_rgba(1,4,31,0.42)]"
                  priority={index === 0}
                />
                <span className="absolute inset-0 rounded-[14px] border border-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
              </button>

              <div className="pointer-events-none absolute -inset-px z-30 flex translate-x-full flex-col rounded-[14px] border border-white/20 bg-[#071052]/74 p-[7%] opacity-0 shadow-[0_16px_28px_rgba(1,4,31,0.34)] backdrop-blur-[12px] transition duration-300 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100">
                <div
                  className="pointer-events-none absolute inset-0 rounded-[14px] opacity-95"
                  style={{
                    background: `linear-gradient(145deg, rgba(255,255,255,0.18), ${mode.accent}66 52%, rgba(8,14,74,0.62))`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_38%,rgba(2,6,36,0.18))]" />
                <div className="relative mb-[8%] flex items-center justify-between">
                  <span className="text-[clamp(14px,1vw,19px)] font-black">{mode.title}</span>
                  <span className="h-[3px] w-[42px] rounded-full" style={{ backgroundColor: mode.accent }} />
                </div>
                <div className="relative grid flex-1 grid-rows-4 gap-[4.5%]">
                  {mode.options.map((option) => (
                    <button
                      type="button"
                      key={option.label}
                      disabled={option.disabled}
                      onClick={() => option.href && handleCreateRoom(option.href)}
                      className={`flex h-full min-h-0 items-center justify-between rounded-[10px] px-[7%] text-[clamp(12px,0.84vw,16px)] font-bold transition ${
                        option.disabled
                          ? 'cursor-not-allowed border border-white/16 bg-white/16 text-white/42'
                          : 'border border-white/70 bg-white/86 text-[#090d4f] shadow-[0_8px_18px_rgba(2,6,36,0.16)] hover:translate-x-[4px] hover:bg-white'
                      }`}
                    >
                      <span>{pendingRoomAction === option.href?.replace('/room/', '') ? '创建中...' : option.label}</span>
                      {!option.disabled && <ChevronRight className="h-[16px] w-[16px] stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {roomMessage && (
        <div className="absolute left-1/2 top-[76%] z-40 -translate-x-1/2 rounded-full border border-white/18 bg-[#071052]/80 px-5 py-2 text-[13px] font-bold text-[#ffd84d] shadow-[0_10px_22px_rgba(2,5,38,0.24)] backdrop-blur-[10px]">
          {roomMessage}
        </div>
      )}

      <section className="absolute left-[38.2%] top-[74%] z-10 flex h-[10vh] w-[50.8%] gap-[1.1vw]">
        {quickActions.map(({ title, en, icon: Icon, href }) => (
          <button
            type="button"
            key={title}
            onClick={() => router.push(href)}
            className="relative flex h-full flex-1 items-center justify-center gap-[1vw] rounded-[12px] border border-white/16 bg-white/88 text-[#0926c8] shadow-[0_14px_26px_rgba(1,4,31,0.26)] transition hover:-translate-y-[2px] hover:bg-white"
          >
            <Icon className="h-[32px] w-[32px]" fill="currentColor" />
            <div className="text-left">
              <div className="text-[clamp(15px,1.08vw,20px)] font-black leading-none text-[#07105d]">{title}</div>
              <div className="mt-[4px] text-[clamp(9px,0.64vw,12px)] font-black italic">{en}</div>
            </div>
            <ChevronRight className="absolute right-[7%] h-[18px] w-[18px] stroke-[3]" />
          </button>
        ))}
      </section>

      <section className="absolute bottom-[5.6%] left-[3.1%] z-10 flex h-[10.5vh] min-h-[82px] w-[25vw] min-w-[350px] items-center gap-[1vw] rounded-[12px] border border-white/14 bg-[#071287]/78 px-[0.75vw] shadow-[0_0_18px_rgba(28,61,255,0.34)] backdrop-blur-[10px] transition duration-300 hover:-translate-y-[4px] hover:border-white/28 hover:bg-[#0b18a0]/82 hover:shadow-[0_0_26px_rgba(28,61,255,0.48),0_16px_28px_rgba(1,4,31,0.28)]">
        <div className="relative aspect-square h-[76%] overflow-hidden rounded-[10px] border-[3px] border-[#02022d]">
          <Image src={playerAvatar} alt="玩家头像" fill sizes="7vw" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[clamp(13px,0.9vw,17px)] font-black leading-tight">{playerName}</div>
          <div className="mt-[3px] text-[clamp(11px,0.74vw,14px)] font-black leading-tight">{playerLevel}</div>
          <div className="mt-[7px] flex items-center gap-[7px]">
            <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-[#07073c]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#ffb300,#fff122)]"
                style={{ width: `${playerExpPercent}%` }}
              />
            </div>
            <span className="text-[clamp(10px,0.7vw,12px)] font-black">{playerExp}</span>
          </div>
        </div>
        <Image src="/images/logo-dice.png" alt="" width={100} height={100} className="h-[58%] w-auto object-contain" />
      </section>
    </main>
  )
}

function IconButton({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative grid h-[58px] w-[58px] cursor-pointer place-items-center rounded-full border border-[rgba(62,124,255,0.52)] bg-[rgba(4,12,58,0.7)] text-white shadow-[0_0_13px_rgba(39,98,255,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] transition-[transform,box-shadow,background] duration-300 ease-out hover:-translate-y-px hover:bg-[rgba(29,75,190,0.65)] hover:shadow-[0_0_20px_rgba(91,119,255,0.85)] focus-visible:-translate-y-px focus-visible:bg-[rgba(29,75,190,0.65)] focus-visible:shadow-[0_0_20px_rgba(91,119,255,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/70 [&_svg]:h-[52%] [&_svg]:w-[52%] [&_svg]:stroke-[2.2]"
    >
      {children}
    </button>
  )
}
