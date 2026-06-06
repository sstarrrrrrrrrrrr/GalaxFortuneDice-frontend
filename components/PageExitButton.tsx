import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageExitButtonProps {
  className?: string
  href?: string
  label?: string
}

export function PageExitButton({
  className = '',
  href = '/lobby',
  label = '返回大厅',
}: PageExitButtonProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-300/45 bg-[#071052]/78 text-white shadow-[0_0_16px_rgba(70,105,255,0.45),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition hover:-translate-y-px hover:border-blue-200/70 hover:bg-[#183aa5]/80 hover:shadow-[0_0_22px_rgba(91,119,255,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/80 ${className}`}
    >
      <ArrowLeft className="h-6 w-6 stroke-[2.5]" />
    </Link>
  )
}
