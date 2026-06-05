'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthSessionStore } from '@/hooks/useCurrentUser'
import { loginGuest, loginUser, registerUser } from '@/services/auth'
import { LoginPanel, type AuthView } from './components/LoginPanel'
import { getAuthErrorMessage } from './utils/auth'

// 登录页容器，管理登录/注册/游客入口状态和认证接口提交流程。
export default function LoginPage() {
  const router = useRouter()
  const setSession = useAuthSessionStore((state) => state.setSession)
  const clearSession = useAuthSessionStore((state) => state.clearSession)
  const [view, setView] = useState<AuthView>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreed, setAgreed] = useState(true)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isGuestLoggingIn, setIsGuestLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  // 返回登录视图时重置密码可见状态，避免跨表单残留。
  const goLogin = () => {
    setView('login')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  // 提交账号密码登录，成功后写入会话和 cookie 并进入大厅。
  const handleAccountLogin = async () => {
    setAuthMessage('')

    if (!phone.trim() || !password) {
      setAuthMessage('请输入手机号和密码')
      return
    }

    try {
      setIsLoggingIn(true)
      const response = await loginUser({
        phone: phone.trim(),
        password,
      })
      const {
        data: { token, user_info: userInfo },
      } = response

      document.cookie = 'guest_mode=; path=/; max-age=0'
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=86400; sameSite=lax`
      setSession(userInfo, token)
      router.push('/lobby')
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, '登录失败，请检查账号或稍后重试'))
    } finally {
      setIsLoggingIn(false)
    }
  }

  // 提交游客登录，成功后标记 guest_mode 并进入游客大厅。
  const handleGuestLogin = async () => {
    setAuthMessage('')

    try {
      setIsGuestLoggingIn(true)
      const response = await loginGuest()
      const {
        data: { token, user_info: userInfo },
      } = response

      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=86400; sameSite=lax`
      document.cookie = 'guest_mode=true; path=/; max-age=86400; sameSite=lax'
      setSession(userInfo, token)
      router.push('/lobby?mode=guest')
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, '游客登录失败，请稍后重试'))
    } finally {
      setIsGuestLoggingIn(false)
    }
  }

  // 提交注册信息，成功后清理旧会话并回到登录视图。
  const handleRegister = async () => {
    setAuthMessage('')

    if (!agreed) {
      setAuthMessage('请先同意用户协议和隐私政策')
      return
    }

    if (!phone.trim() || !password || !confirmPassword || !nickname.trim()) {
      setAuthMessage('请完整填写注册信息')
      return
    }

    if (password !== confirmPassword) {
      setAuthMessage('两次输入的密码不一致')
      return
    }

    try {
      setIsRegistering(true)
      await registerUser({
        phone: phone.trim(),
        nickname: nickname.trim(),
        password,
      })

      clearSession()
      document.cookie = 'guest_mode=; path=/; max-age=0'
      document.cookie = 'token=; path=/; max-age=0'
      setPassword('')
      setConfirmPassword('')
      setNickname('')
      setView('login')
      setAuthMessage('注册成功，请登录')
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error, '注册失败，请稍后重试'))
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <LoginPanel
      view={view}
      onViewChange={setView}
      onBackToLogin={goLogin}
      phone={phone}
      onPhoneChange={setPhone}
      password={password}
      onPasswordChange={setPassword}
      confirmPassword={confirmPassword}
      onConfirmPasswordChange={setConfirmPassword}
      nickname={nickname}
      onNicknameChange={setNickname}
      showPassword={showPassword}
      onTogglePassword={() => setShowPassword((value) => !value)}
      showConfirmPassword={showConfirmPassword}
      onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
      agreed={agreed}
      onAgreedChange={setAgreed}
      authMessage={authMessage}
      isLoggingIn={isLoggingIn}
      isGuestLoggingIn={isGuestLoggingIn}
      isRegistering={isRegistering}
      onAccountLogin={handleAccountLogin}
      onGuestLogin={handleGuestLogin}
      onRegister={handleRegister}
    />
  )
}
