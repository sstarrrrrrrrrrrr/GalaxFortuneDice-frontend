'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw } from 'lucide-react'

export default function RoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Room error:', error)
  }, [error])

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#08031a]">
      <div className="text-center max-w-md px-6">
        <h2 className="text-[28px] font-bold text-white mb-3">房间错误</h2>
        <p className="text-[14px] text-white/40 mb-8">
          无法加载房间信息，可能是房间不存在或已被删除。
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            重试
          </button>
          <button
            onClick={() => router.push('/lobby')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回大厅
          </button>
        </div>
      </div>
    </div>
  )
}
