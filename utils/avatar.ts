export const DEFAULT_AVATAR_SRC = '/images/default_avatar.png'

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
