import { useEffect, useState } from 'react'

// 统一处理客户端挂载标记，避免 SSR/hydration 前读取浏览器状态。
export function useClientMounted() {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    const mountedTimer = window.setTimeout(() => setHasMounted(true), 0)

    return () => window.clearTimeout(mountedTimer)
  }, [])

  return hasMounted
}
