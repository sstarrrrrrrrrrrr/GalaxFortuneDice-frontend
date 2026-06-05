import { useEffect, useRef } from 'react'

// 保存某个值的最新引用，供异步回调读取最新状态。
export function useLatestRef<T>(value: T) {
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  return valueRef
}
