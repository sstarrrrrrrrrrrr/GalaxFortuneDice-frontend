import Image from 'next/image'
import { Ban, Check, Copy, MessageSquare, Plus, Send, Smile } from 'lucide-react'
import type { RoomChannelNotice } from '@/websocket/room'

export interface RoomPlayer {
  id: number
  name: string
  avatar?: string
  emoji?: string
  ready: boolean
  seatNo?: number
  isHost?: boolean
}

export interface RoomDialog {
  title: string
  message: string
  confirmText: string
  cancelText?: string
  tone: 'danger' | 'info'
  onConfirm: () => void
}

interface RoomViewProps {
  modeName: string
  maxPlayers: number
  playerCount: number
  displayRoomCode: string
  displayPlayers: RoomPlayer[]
  displayRoomMessages: RoomChannelNotice[]
  notice: string
  roomDialog: RoomDialog | null
  isLeavingRoom: boolean
  isUpdatingReady: boolean
  isStartingMatch: boolean
  roomActionLabel: string
  roomActionHint: string
  roomActionButtonClass: string
  onCopyRoomCode: () => void
  onLeaveRoom: () => void
  onRoomAction: () => void
  onCancelDialog: () => void
}

const visibleSlots = 4

// 渲染房间等待页主视图，包括房间信息、玩家槽位、消息和房间操作。
export function RoomView({
  modeName,
  maxPlayers,
  playerCount,
  displayRoomCode,
  displayPlayers,
  displayRoomMessages,
  notice,
  roomDialog,
  isLeavingRoom,
  isUpdatingReady,
  isStartingMatch,
  roomActionLabel,
  roomActionHint,
  roomActionButtonClass,
  onCopyRoomCode,
  onLeaveRoom,
  onRoomAction,
  onCancelDialog,
}: RoomViewProps) {
  return (
    <main className="relative h-screen min-h-[560px] w-screen min-w-[960px] overflow-hidden bg-[#020423] text-white">
      <Image src="/images/room-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_53%_45%,rgba(116,70,255,0.2),transparent_34%),radial-gradient(circle_at_78%_24%,rgba(57,123,255,0.14),transparent_24%),linear-gradient(180deg,rgba(1,3,34,0.08),rgba(1,3,34,0.46))]" />
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[radial-gradient(ellipse_at_center,rgba(39,40,255,0.28),transparent_64%)]" />

      <header className="absolute left-[2.1%] top-[3.5%] z-20">
        <Image
          src="/images/logo.png"
          alt="银河大乐骰"
          width={230}
          height={70}
          priority
          className="h-[6.5vh] w-auto object-contain drop-shadow-[0_0_12px_rgba(104,123,255,0.72)]"
        />
      </header>

      <RoomSidebar
        modeName={modeName}
        maxPlayers={maxPlayers}
        playerCount={playerCount}
        messages={displayRoomMessages}
      />

      <RoomCodeHeader displayRoomCode={displayRoomCode} onCopyRoomCode={onCopyRoomCode} />

      <button
        type="button"
        onClick={onLeaveRoom}
        disabled={isLeavingRoom}
        className="absolute right-[3.2%] top-[4.2%] z-30 rounded-[9px] border border-white/18 bg-[#081052]/62 px-[18px] py-[10px] text-[clamp(12px,0.82vw,15px)] font-black text-white/90 shadow-[0_10px_24px_rgba(2,5,38,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px] transition hover:bg-white/12 disabled:cursor-wait disabled:opacity-60"
      >
        {isLeavingRoom ? '离开中...' : '离开房间'}
      </button>

      <PlayerSlots displayPlayers={displayPlayers} maxPlayers={maxPlayers} />

      {notice && <NoticePill notice={notice} />}

      {roomDialog && (
        <RoomDialogModal
          dialog={roomDialog}
          busy={isLeavingRoom}
          onCancel={roomDialog.cancelText ? onCancelDialog : undefined}
        />
      )}

      <button
        type="button"
        onClick={onRoomAction}
        disabled={isUpdatingReady || isStartingMatch}
        className={roomActionButtonClass}
      >
        <span className="relative text-[clamp(22px,2vw,34px)] font-black leading-none tracking-[0.04em] [text-shadow:0_0_12px_rgba(255,255,255,0.34)]">
          {roomActionLabel}
        </span>
        <span className="relative mt-[0.8vh] text-[clamp(11px,0.95vw,16px)] font-black leading-none text-white/82">
          {roomActionHint}
        </span>
      </button>

      <Send className="pointer-events-none absolute bottom-[30.8%] left-[45.8%] h-[2.4vw] max-h-[36px] min-h-[24px] w-[2.4vw] min-w-[24px] max-w-[36px] rotate-[-22deg] text-[#5057ff]/20" />
    </main>
  )
}

// 渲染房间左侧信息和消息面板。
function RoomSidebar({
  modeName,
  maxPlayers,
  playerCount,
  messages,
}: {
  modeName: string
  maxPlayers: number
  playerCount: number
  messages: RoomChannelNotice[]
}) {
  return (
    <aside className="absolute left-[2.2%] top-[14.5%] z-20 flex w-[21.7%] min-w-[214px] flex-col gap-[1.7vh]">
      <section className="relative overflow-hidden rounded-[12px] border border-white/24 bg-[linear-gradient(180deg,rgba(58,67,194,0.62),rgba(15,18,98,0.76))] px-[7%] py-[6.4%] shadow-[0_14px_28px_rgba(2,5,38,0.24),0_0_20px_rgba(92,104,255,0.2),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-[10px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent)]" />
        <div className="pointer-events-none absolute -right-[18%] -top-[35%] h-[62%] w-[70%] rounded-full bg-[#8794ff]/18 blur-[24px]" />
        <h2 className="relative mb-[5.5%] text-[clamp(13px,1.08vw,20px)] font-black tracking-[0.04em]">房间信息</h2>
        <div className="relative">
          <InfoRow label="游戏模式" value={modeName} />
          <InfoRow label="房间人数" value={`${Math.min(playerCount, maxPlayers)}/${maxPlayers}`} />
          <InfoRow label="房主权限" value="可开始游戏" />
        </div>
      </section>

      <section className="relative flex h-[49.5vh] min-h-[290px] flex-col overflow-hidden rounded-[12px] border border-white/24 bg-[linear-gradient(180deg,rgba(45,55,178,0.62),rgba(8,10,74,0.8))] shadow-[0_14px_28px_rgba(2,5,38,0.24),0_0_20px_rgba(92,104,255,0.18),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-[10px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[24%] bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative flex items-center justify-between border-b border-white/10 px-[7%] pb-[4.5%] pt-[6%]">
          <h2 className="text-[clamp(13px,1.08vw,20px)] font-black tracking-[0.04em]">房间消息</h2>
          <MessageSquare className="h-[1.25vw] max-h-[21px] min-h-[15px] w-[1.25vw] min-w-[15px] max-w-[21px] fill-white text-white" />
        </div>
        <div className="relative flex-1 space-y-[4.4%] px-[7%] pt-[5%] text-[clamp(10px,0.82vw,15px)] font-bold">
          {messages.length === 0 ? (
            <p className="text-white/50">等待房间动态...</p>
          ) : (
            messages.map((message) => (
              <p key={message.id} className="truncate text-white/88">
                <span className={messageToneClass(message.tone)}>{message.name}</span>：{message.text}
              </p>
            ))
          )}
        </div>
        <div className="relative flex items-center gap-[3%] px-[6%] pb-[5.2%]">
          <div className="flex h-[4.6vh] min-h-[34px] flex-1 items-center gap-[4%] rounded-[8px] border border-white/10 bg-[#050418]/66 px-[5%] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <input
              aria-label="输入消息"
              placeholder="输入消息..."
              className="min-w-0 flex-1 bg-transparent text-[clamp(10px,0.82vw,14px)] font-bold outline-none placeholder:text-white/42"
            />
            <Smile className="h-[1.15vw] max-h-[20px] min-h-[15px] w-[1.15vw] min-w-[15px] max-w-[20px]" />
          </div>
          <button
            type="button"
            className="flex h-[4.6vh] min-h-[34px] min-w-[62px] shrink-0 items-center justify-center whitespace-nowrap rounded-[8px] bg-[linear-gradient(180deg,#7665ff,#4f3cff)] px-[14px] text-[clamp(10px,0.78vw,14px)] font-black shadow-[0_0_14px_rgba(96,84,255,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-[1px] hover:brightness-110"
          >
            发送
          </button>
        </div>
      </section>
    </aside>
  )
}

// 渲染房间号展示区，并提供复制房间号入口。
function RoomCodeHeader({
  displayRoomCode,
  onCopyRoomCode,
}: {
  displayRoomCode: string
  onCopyRoomCode: () => void
}) {
  return (
    <section className="absolute left-[25.8%] right-[10.2%] top-[6.8%] z-10 flex flex-col items-center">
      <div className="flex items-center gap-[0.8vw] rounded-[999px] border border-white/18 bg-[#080842]/62 px-[2vw] py-[1.1vh] text-[clamp(18px,2.1vw,31px)] font-black tracking-[0.08em] text-white shadow-[0_12px_28px_rgba(2,5,38,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[10px] [text-shadow:0_0_10px_#5757ff,0_2px_0_#15106e]">
        <span>房间号：</span>
        <span>{displayRoomCode}</span>
        <button
          type="button"
          aria-label="复制房间号"
          onClick={onCopyRoomCode}
          className="flex h-[2.3vw] max-h-[31px] min-h-[24px] w-[2.3vw] min-w-[24px] max-w-[31px] items-center justify-center rounded-[6px] text-white/90 transition hover:bg-white/10"
        >
          <Copy className="h-[70%] w-[70%] stroke-[3]" />
        </button>
      </div>
      <p className="mt-[1.6vh] text-[clamp(12px,1.05vw,17px)] font-black tracking-[0.08em] text-[#e9edff]/86 [text-shadow:0_0_8px_#565cff]">
        等待玩家加入，准备后即可开始
      </p>
    </section>
  )
}

// 渲染固定四个玩家槽位，并根据房间人数显示可加入或不可加入状态。
function PlayerSlots({ displayPlayers, maxPlayers }: { displayPlayers: RoomPlayer[]; maxPlayers: number }) {
  return (
    <section className="absolute left-[30.4%] right-[6.3%] top-[32.5%] z-20">
      <div className="grid grid-cols-4 gap-[3.5%]">
        {Array.from({ length: visibleSlots }).map((_, index) => {
          const player = displayPlayers[index]
          const disabled = index >= maxPlayers

          if (disabled) {
            return <DisabledSlot key={`disabled-${index}`} slot={index + 1} />
          }

          if (!player) {
            return <WaitingSlot key={`waiting-${index}`} slot={index + 1} />
          }

          return <PlayerSlot key={player.id} slot={index + 1} player={player} />
        })}
      </div>
    </section>
  )
}

// 渲染房间底部的短提示条。
function NoticePill({ notice }: { notice: string }) {
  return (
    <div className="absolute bottom-[22.2%] left-[50.4%] z-30 -translate-x-1/2 rounded-full border border-white/18 bg-[#0b1458]/72 px-[1.45vw] py-[0.72vh] text-[clamp(12px,0.88vw,15px)] font-bold text-white/92 shadow-[0_10px_24px_rgba(2,5,38,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-[10px]">
      {notice}
    </div>
  )
}

// 渲染房间信息面板中的键值行。
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-[4.1%] flex items-center gap-[0.6vw] text-[clamp(11px,0.92vw,16px)] font-bold">
      <span className="text-white/74">{label}：</span>
      <span className="text-white">{value}</span>
    </div>
  )
}

// 渲染离开房间、房间关闭等确认弹窗。
function RoomDialogModal({
  dialog,
  busy,
  onCancel,
}: {
  dialog: RoomDialog
  busy: boolean
  onCancel?: () => void
}) {
  const isDanger = dialog.tone === 'danger'

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#02031d]/76 backdrop-blur-[9px]">
      <section className="relative mt-[42px] w-[min(620px,72vw)] px-[52px] pb-[34px] pt-[72px] text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] border border-[#477cff]/90 bg-[linear-gradient(155deg,rgba(15,35,161,0.97),rgba(5,14,91,0.98)_58%,rgba(3,8,61,0.99))] shadow-[0_26px_72px_rgba(0,0,0,0.52),0_0_34px_rgba(54,93,255,0.48),inset_0_1px_0_rgba(151,190,255,0.34)]">
          <div className="absolute inset-x-[3%] bottom-[-24%] h-[48%] rounded-[50%] border border-[#2d6fff]/28 shadow-[0_0_35px_rgba(45,91,255,0.24)]" />
          <div className="absolute inset-x-[11%] bottom-[-17%] h-[36%] rounded-[50%] border border-[#2d6fff]/20" />
          <div className="absolute inset-x-[12%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(145,207,255,0.9),transparent)]" />
          <div className="absolute left-1/2 top-[-90px] h-[180px] w-[300px] -translate-x-1/2 rounded-full bg-[#624cff]/24 blur-[46px]" />
          <div className="absolute left-[9%] top-[48%] h-2 w-2 rounded-full bg-white shadow-[0_0_14px_4px_rgba(112,150,255,0.78)]" />
          <div className="absolute right-[13%] top-[64%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_4px_rgba(112,150,255,0.72)]" />
          <div className="absolute left-[29%] top-[15%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_4px_rgba(130,170,255,0.78)]" />
          <Image
            src="/images/dice.png"
            alt=""
            width={128}
            height={128}
            className="absolute -left-[3%] top-[50%] h-[86px] w-[86px] rotate-[-18deg] object-contain opacity-10"
          />
          <Image
            src="/images/dice.png"
            alt=""
            width={142}
            height={142}
            className="absolute -right-[4%] top-[36%] h-[104px] w-[104px] rotate-[18deg] object-contain opacity-10"
          />
        </div>
        <div className="absolute left-1/2 top-0 z-10 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#8d8cff]/80 bg-[radial-gradient(circle_at_42%_24%,rgba(205,148,255,0.98),rgba(55,58,220,0.96)_50%,rgba(16,188,255,0.9))] shadow-[0_0_0_9px_rgba(82,77,255,0.16),0_0_30px_rgba(126,67,255,0.9),0_0_46px_rgba(18,207,255,0.38)]">
          <div className="absolute inset-[8px] rounded-full border border-white/24 bg-[#1d21a4]/44 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]" />
          <Image
            src="/images/logo-dice.png"
            alt=""
            width={82}
            height={82}
            className="relative h-[64px] w-[64px] object-contain drop-shadow-[0_0_16px_rgba(255,255,255,0.64)]"
          />
        </div>
        <div className="relative mx-auto mb-[16px] flex items-center justify-center gap-[14px]">
          <span className="h-px w-[72px] bg-[linear-gradient(90deg,transparent,#7894ff)]" />
          <span className="h-[13px] w-[13px] rotate-45 bg-[#7894ff] shadow-[0_0_14px_rgba(120,150,255,0.9)]" />
          <h2 className="max-w-[360px] break-words text-[clamp(24px,1.75vw,32px)] font-black tracking-[0.04em] text-white [text-shadow:0_0_12px_rgba(98,110,255,0.82)]">
            {dialog.title}
          </h2>
          <span className="h-[13px] w-[13px] rotate-45 bg-[#7894ff] shadow-[0_0_14px_rgba(120,150,255,0.9)]" />
          <span className="h-px w-[72px] bg-[linear-gradient(90deg,#7894ff,transparent)]" />
        </div>
        <p className="relative mx-auto max-w-[450px] break-words text-[clamp(15px,1vw,18px)] font-bold leading-[1.65] text-[#dce6ff] [text-wrap:balance] [text-shadow:0_0_10px_rgba(68,90,255,0.3)]">
          {dialog.message.includes('自动解散') ? (
            <>
              {dialog.message.split('自动解散')[0]}
              <span className="font-black text-[#ffd322]">自动解散</span>
              {dialog.message.split('自动解散')[1]}
            </>
          ) : (
            dialog.message
          )}
        </p>
        <div className="relative mt-[26px] flex justify-center gap-[18px]">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="h-[52px] min-w-[148px] rounded-[11px] border border-[#5272e8] bg-[linear-gradient(180deg,rgba(18,30,124,0.9),rgba(7,14,76,0.96))] px-6 text-[clamp(15px,1.04vw,18px)] font-black text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_20px_rgba(1,5,43,0.3)] transition hover:-translate-y-[1px] hover:border-[#8ba1ff] hover:bg-[#162b91] disabled:cursor-wait disabled:opacity-60"
            >
              {dialog.cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={dialog.onConfirm}
            disabled={busy}
            className={`h-[52px] min-w-[156px] rounded-[11px] border px-6 text-[clamp(15px,1.04vw,18px)] font-black text-white transition hover:-translate-y-[1px] hover:brightness-110 disabled:cursor-wait disabled:opacity-60 ${isDanger ? 'border-[#ff8bc8]/80 bg-[linear-gradient(135deg,#b736db,#7047ff_54%,#276dff)] shadow-[0_0_22px_rgba(169,66,255,0.5),inset_0_1px_0_rgba(255,255,255,0.26)]' : 'border-[#66eaff] bg-[linear-gradient(135deg,#6f43ff,#1273ff_62%,#18dfff)] shadow-[0_0_20px_rgba(88,134,255,0.54),inset_0_1px_0_rgba(255,255,255,0.22)]'}`}
          >
            {busy ? '处理中...' : dialog.confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}

// 渲染已有玩家的座位卡片和准备状态。
function PlayerSlot({ slot, player }: { slot: number; player: RoomPlayer }) {
  return (
    <article className={slotShellClass()}>
      <SlotNumber slot={slot} />
      <div className="relative mt-[25%] h-[5.8vw] max-h-[86px] min-h-[70px] w-[5.8vw] min-w-[70px] max-w-[86px] rounded-full border-[3px] border-[#78f3ff] bg-[#06145b] shadow-[0_0_22px_rgba(88,131,255,0.62)]">
        {player.avatar ? (
          <Image src={player.avatar} alt={player.name} fill sizes="86px" className="rounded-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_35%,#ffcf4a,#23135e_72%)] text-[clamp(22px,2vw,34px)] font-black">
            {player.emoji}
          </div>
        )}
      </div>
      <h3 className="mt-[6%] max-w-[82%] truncate text-[clamp(12px,1.08vw,18px)] font-black text-white [text-shadow:0_0_7px_rgba(100,135,255,0.9)]">
        {player.name}
      </h3>
      {player.isHost && (
        <div className="mt-[6%] rounded-[5px] bg-[#673dff] px-[12%] py-[2.3%] text-[clamp(10px,0.78vw,13px)] font-black shadow-[0_0_10px_rgba(109,72,255,0.7)]">
          房主
        </div>
      )}
      <div className="flex-1" />
      {!player.isHost && player.ready ? (
        <div className="mb-[14%] flex items-center gap-[0.42vw] text-[clamp(11px,0.95vw,16px)] font-black text-[#18ffef]">
          <Check className="h-[1.2vw] max-h-[18px] min-h-[14px] w-[1.2vw] min-w-[14px] max-w-[18px] rounded-full bg-[#18ffef] p-[2px] text-[#07105b] stroke-[4]" />
          已准备
        </div>
      ) : !player.isHost ? (
        <div className="mb-[14%] rounded-[6px] bg-[#5847ff] px-[13%] py-[5%] text-[clamp(11px,0.95vw,16px)] font-black shadow-[0_0_13px_rgba(98,84,255,0.7)]">
          未准备
        </div>
      ) : null}
    </article>
  )
}

// 渲染可加入但暂无玩家的等待槽位。
function WaitingSlot({ slot }: { slot: number }) {
  return (
    <article className={slotShellClass(true)}>
      <SlotNumber slot={slot} />
      <div className="mt-[31%] flex h-[6vw] max-h-[90px] min-h-[76px] w-[6vw] min-w-[76px] max-w-[90px] items-center justify-center rounded-full border border-white/10 bg-[#4b4cff]/35 shadow-[0_0_24px_rgba(126,116,255,0.42),inset_0_0_20px_rgba(255,255,255,0.12)]">
        <Plus className="h-[61%] w-[61%] stroke-[4.5] text-white" />
      </div>
      <div className="flex-1" />
      <p className="mb-[27%] text-[clamp(11px,0.92vw,16px)] font-black text-white/88">等待玩家加入</p>
    </article>
  )
}

// 渲染超出当前玩法人数上限的禁用槽位。
function DisabledSlot({ slot }: { slot: number }) {
  return (
    <article className="relative flex h-[40.5vh] min-h-[256px] flex-col items-center overflow-hidden rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(47,48,140,0.36),rgba(4,7,42,0.66))] opacity-75 shadow-[0_0_13px_rgba(64,63,255,0.18),inset_0_0_22px_rgba(117,105,255,0.1)]">
      <SlotNumber slot={slot} muted />
      <div className="mt-[31%] flex h-[6vw] max-h-[90px] min-h-[76px] w-[6vw] min-w-[76px] max-w-[90px] items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Ban className="h-[60%] w-[60%] text-white/55" />
      </div>
      <div className="flex-1" />
      <p className="mb-[27%] text-[clamp(11px,0.92vw,16px)] font-black text-white/42">不可加入</p>
    </article>
  )
}

// 渲染玩家槽位顶部的序号标记。
function SlotNumber({ slot, muted = false }: { slot: number; muted?: boolean }) {
  return (
    <div className={`absolute left-1/2 top-[4.3%] flex aspect-square h-[2vw] max-h-[29px] min-h-[23px] -translate-x-1/2 items-center justify-center rounded-full text-[clamp(12px,1.05vw,17px)] font-black shadow-[0_2px_7px_rgba(0,0,0,0.45)] ${muted ? 'bg-[#1d2368] text-white/58' : 'bg-[#1a237d] text-white'}`}>
      {slot}
    </div>
  )
}

// 生成玩家槽位外壳样式，empty 用于等待槽位的悬停反馈。
function slotShellClass(empty = false) {
  return `relative flex h-[40.5vh] min-h-[256px] flex-col items-center overflow-hidden rounded-[12px] border border-[#667dff]/58 bg-[linear-gradient(180deg,rgba(108,99,255,0.66),rgba(9,11,73,0.86))] shadow-[0_0_18px_rgba(75,100,255,0.56),inset_0_0_27px_rgba(111,101,255,0.34)] ${empty ? 'cursor-pointer transition hover:brightness-110' : ''}`
}

// 根据消息语气返回对应的文字颜色。
function messageToneClass(tone?: RoomChannelNotice['tone']) {
  if (tone === 'green') return 'text-[#42ff96]'
  if (tone === 'cyan') return 'text-[#56e8ff]'
  if (tone === 'pink') return 'text-[#ff7af2]'
  return 'text-[#ffd560]'
}
