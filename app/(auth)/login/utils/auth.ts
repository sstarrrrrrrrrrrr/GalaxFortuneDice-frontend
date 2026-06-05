// 将接口错误转换为登录页可展示的错误文案。
export function getAuthErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
