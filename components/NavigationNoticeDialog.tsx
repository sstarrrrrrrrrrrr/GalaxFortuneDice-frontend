'use client'

interface NavigationNoticeDialogProps {
  open: boolean
  title: string
  message: string
  onClose: () => void
}

export function NavigationNoticeDialog({
  open,
  title,
  message,
  onClose,
}: NavigationNoticeDialogProps) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#02031d]/78 backdrop-blur-[9px]">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="navigation-notice-title"
        aria-describedby="navigation-notice-message"
        className="relative w-[min(520px,72vw)] overflow-hidden rounded-[20px] border border-[#527fff]/80 bg-[linear-gradient(155deg,rgba(15,35,161,0.98),rgba(5,14,91,0.98)_58%,rgba(3,8,61,0.99))] px-12 pb-9 pt-10 text-center shadow-[0_26px_72px_rgba(0,0,0,0.52),0_0_34px_rgba(54,93,255,0.44),inset_0_1px_0_rgba(151,190,255,0.3)]"
      >
        <div className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(145,207,255,0.9),transparent)]" />
        <div className="pointer-events-none absolute left-1/2 top-[-80px] h-[160px] w-[280px] -translate-x-1/2 rounded-full bg-[#624cff]/24 blur-[44px]" />

        <h2
          id="navigation-notice-title"
          className="relative text-[clamp(23px,1.65vw,30px)] font-black tracking-[0.04em] text-white [text-shadow:0_0_12px_rgba(98,110,255,0.82)]"
        >
          {title}
        </h2>
        <p
          id="navigation-notice-message"
          className="relative mx-auto mt-4 max-w-[390px] text-[clamp(15px,1vw,18px)] font-bold leading-[1.7] text-[#dce6ff]"
        >
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="relative mt-7 h-[52px] min-w-[156px] rounded-[11px] border border-[#66eaff] bg-[linear-gradient(135deg,#6f43ff,#1273ff_62%,#18dfff)] px-7 text-[16px] font-black text-white shadow-[0_0_20px_rgba(88,134,255,0.54),inset_0_1px_0_rgba(255,255,255,0.22)] transition hover:-translate-y-[1px] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80"
        >
          我知道了
        </button>
      </section>
    </div>
  )
}
