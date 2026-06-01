import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">404 - 页面不存在</h2>
        <p className="text-gray-600 mb-8">
          抱歉，你访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 transition-colors inline-block"
        >
          返回首页
        </Link>
      </div>
    </div>
  )
}