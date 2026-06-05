export const DEFAULT_AVATAR_SRC = '/images/default_avatar.png'

// 统一把后端头像字段转换为可直接渲染的图片地址。
export function normalizeAvatarSrc(avatar: unknown) {
  if (typeof avatar !== 'string' || !avatar.trim()) {
    return DEFAULT_AVATAR_SRC
  }

  const trimmedAvatar = avatar.trim()

  if (trimmedAvatar.startsWith('/') || trimmedAvatar.startsWith('http://') || trimmedAvatar.startsWith('https://')) {
    return trimmedAvatar
  }

  return `/images/${trimmedAvatar}`
}
