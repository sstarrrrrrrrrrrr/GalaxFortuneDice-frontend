export interface ApiEnvelope<T> {
  code: number
  msg?: string
  data: T
}

// 兼容直接返回数据和 { code, msg, data } 包装格式，并统一抛出业务错误。
export function unwrapApiData<T>(response: T | ApiEnvelope<T>) {
  if (response && typeof response === 'object' && 'code' in response && 'data' in response) {
    const envelope = response as ApiEnvelope<T>
    if (envelope.code !== 0 && envelope.code !== 200) {
      throw new Error(envelope.msg || '请求失败')
    }

    return envelope.data
  }

  return response as T
}
