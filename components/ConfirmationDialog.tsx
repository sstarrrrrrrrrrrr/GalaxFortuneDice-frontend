'use client'

import Image from 'next/image'

export interface ConfirmationDialogConfig {
  title: string
  message: string
  confirmText: string
  cancelText?: string
  tone: 'danger' | 'info'
  onConfirm: () => void
}

interface ConfirmationDialogProps {
  dialog: ConfirmationDialogConfig
  busy?: boolean
  busyText?: string
  onCancel?: () => void
}

export function ConfirmationDialog({
  dialog,
  busy = false,
  busyText = '处理中...',
  onCancel,
}: ConfirmationDialogProps) {
  const isDanger = dialog.tone === 'danger'

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#02031d]/76 backdrop-blur-[9px]">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-message"
        className="relative mt-[42px] w-[min(620px,72vw)] px-[52px] pb-[34px] pt-[72px] text-center"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px] border border-[#477cff]/90 bg-[linear-gradient(155deg,rgba(15,35,161,0.97),rgba(5,14,91,0.98)_58%,rgba(3,8,61,0.99))] shadow-[0_26px_72px_rgba(0,0,0,0.52),0_0_34px_rgba(54,93,255,0.48),inset_0_1px_0_rgba(151,190,255,0.34)]">
          <div className="absolute inset-x-[3%] bottom-[-24%] h-[48%] rounded-[50%] border border-[#2d6fff]/28 shadow-[0_0_35px_rgba(45,91,255,0.24)]" />
          <div className="absolute inset-x-[11%] bottom-[-17%] h-[36%] rounded-[50%] border border-[#2d6fff]/20" />
          <div className="absolute inset-x-[12%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(145,207,255,0.9),transparent)]" />
          <div className="absolute left-1/2 top-[-90px] h-[180px] w-[300px] -translate-x-1/2 rounded-full bg-[#624cff]/24 blur-[46px]" />
          <Image src="/images/dice.png" alt="" width={128} height={128} className="absolute -left-[3%] top-[50%] h-[86px] w-[86px] rotate-[-18deg] object-contain opacity-10" />
          <Image src="/images/dice.png" alt="" width={142} height={142} className="absolute -right-[4%] top-[36%] h-[104px] w-[104px] rotate-[18deg] object-contain opacity-10" />
        </div>

        <div className="absolute left-1/2 top-0 z-10 flex h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#8d8cff]/80 bg-[radial-gradient(circle_at_42%_24%,rgba(205,148,255,0.98),rgba(55,58,220,0.96)_50%,rgba(16,188,255,0.9))] shadow-[0_0_0_9px_rgba(82,77,255,0.16),0_0_30px_rgba(126,67,255,0.9),0_0_46px_rgba(18,207,255,0.38)]">
          <div className="absolute inset-[8px] rounded-full border border-white/24 bg-[#1d21a4]/44" />
          <Image src="/images/logo-dice.png" alt="" width={82} height={82} className="relative h-[64px] w-[64px] object-contain drop-shadow-[0_0_16px_rgba(255,255,255,0.64)]" />
        </div>

        <div className="relative mx-auto mb-[16px] flex items-center justify-center gap-[14px]">
          <span className="h-px w-[72px] bg-[linear-gradient(90deg,transparent,#7894ff)]" />
          <span className="h-[13px] w-[13px] rotate-45 bg-[#7894ff] shadow-[0_0_14px_rgba(120,150,255,0.9)]" />
          <h2 id="confirmation-dialog-title" className="max-w-[360px] break-words text-[clamp(24px,1.75vw,32px)] font-black tracking-[0.04em] text-white [text-shadow:0_0_12px_rgba(98,110,255,0.82)]">
            {dialog.title}
          </h2>
          <span className="h-[13px] w-[13px] rotate-45 bg-[#7894ff] shadow-[0_0_14px_rgba(120,150,255,0.9)]" />
          <span className="h-px w-[72px] bg-[linear-gradient(90deg,#7894ff,transparent)]" />
        </div>

        <p id="confirmation-dialog-message" className="relative mx-auto max-w-[450px] break-words text-[clamp(15px,1vw,18px)] font-bold leading-[1.65] text-[#dce6ff] [text-wrap:balance]">
          {dialog.message}
        </p>

        <div className="relative mt-[26px] flex justify-center gap-[18px]">
          {onCancel && dialog.cancelText && (
            <button type="button" onClick={onCancel} disabled={busy} className="h-[52px] min-w-[148px] rounded-[11px] border border-[#5272e8] bg-[linear-gradient(180deg,rgba(18,30,124,0.9),rgba(7,14,76,0.96))] px-6 text-[clamp(15px,1.04vw,18px)] font-black text-white/92 transition hover:-translate-y-[1px] disabled:cursor-wait disabled:opacity-60">
              {dialog.cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={dialog.onConfirm}
            disabled={busy}
            autoFocus
            className={`h-[52px] min-w-[156px] rounded-[11px] border px-6 text-[clamp(15px,1.04vw,18px)] font-black text-white transition hover:-translate-y-[1px] hover:brightness-110 disabled:cursor-wait disabled:opacity-60 ${isDanger ? 'border-[#ff8bc8]/80 bg-[linear-gradient(135deg,#b736db,#7047ff_54%,#276dff)] shadow-[0_0_22px_rgba(169,66,255,0.5)]' : 'border-[#66eaff] bg-[linear-gradient(135deg,#6f43ff,#1273ff_62%,#18dfff)] shadow-[0_0_20px_rgba(88,134,255,0.54)]'}`}
          >
            {busy ? busyText : dialog.confirmText}
          </button>
        </div>
      </section>
    </div>
  )
}
