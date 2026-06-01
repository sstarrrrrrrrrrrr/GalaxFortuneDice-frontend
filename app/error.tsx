'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">出错了</h2>
        <p className="text-gray-600 mb-8">
          抱歉，发生了意外错误。请稍后重试。
        </p>
        <div className="space-y-4">
          <button
            onClick={reset}
            className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            重试
          </button>
          <Link
            href="/"
            className="text-purple-600 hover:text-purple-700 underline block"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}