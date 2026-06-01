'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Lock, RefreshCw, ShieldCheck, Smartphone, UserRound } from 'lucide-react'
import { useAuthSessionStore } from '@/hooks/useCurrentUser'
import { loginGuest, loginUser, registerUser } from '@/services/auth'

type AuthView = 'login' | 'guest' | 'register' | 'resetVerify' | 'resetPassword'

const inputClass =
  'h-full min-w-0 flex-1 bg-transparent px-[22px] text-[clamp(14px,0.95vw,17px)] font-medium text-[#1d236f] outline-none placeholder:text-[#a7b2ee]'

const formClass = 'relative flex flex-col gap-[22px] px-[7%] pb-[18px] pt-[34px]'
const registerGroupClass = 'flex flex-col gap-[17px]'

function getAuthErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

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

  const goLogin = () => {
    setView('login')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

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
    <main className="relative h-screen w-screen overflow-hidden bg-[#050026] text-white">
      <Image
        src="/images/login/login-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,45,0.16)_0%,rgba(5,8,45,0.18)_38%,rgba(5,8,45,0.28)_100%)]" />

      <section className="relative z-10 flex h-full w-full items-start justify-center pt-[14.2vh]">
        <div className="w-[40vw] min-w-[360px] max-w-[620px]">
          <div className="login-logo-float mb-[58px] flex justify-center">
            <Image
              src="/images/logo.png"
              alt="银河大乐骰"
              width={316}
              height={95}
              priority
              className="h-[clamp(72px,7.6vw,112px)] w-auto object-contain drop-shadow-[0_0_18px_rgba(122,132,255,0.85)]"
            />
          </div>
          <div className="relative flex flex-col overflow-visible rounded-[18px] border border-[#8794ff]/70 bg-[linear-gradient(180deg,rgba(73,76,255,0.54)_0%,rgba(83,54,210,0.58)_54%,rgba(55,38,182,0.62)_100%)] shadow-[0_0_22px_rgba(93,104,255,0.52),0_18px_42px_rgba(5,8,48,0.42)] backdrop-blur-[16px]">
            {view === 'login' || view === 'guest' ? (
              <Tabs active={view} onChange={setView} />
            ) : (
              <PanelTitle
                title={
                  view === 'register'
                    ? '注册账号'
                    : view === 'resetVerify'
                      ? '找回密码'
                      : '重置密码'
                }
                purple={view === 'register'}
              />
            )}

            {view === 'login' && (
              <form className={formClass}>
                <PhoneField value={phone} onChange={setPhone} />
                <PasswordField
                  placeholder="请输入密码"
                  value={password}
                  onChange={setPassword}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />
                {authMessage && (
                  <p className="text-center text-[clamp(12px,0.84vw,15px)] font-bold text-[#ffd84d]">
                    {authMessage}
                  </p>
                )}
                <PrimaryButton onClick={handleAccountLogin} disabled={isLoggingIn}>
                  {isLoggingIn ? '登录中...' : '登录'}
                </PrimaryButton>
                <div className="flex items-center justify-center gap-[13%] pt-[4px] text-[clamp(13px,0.9vw,16px)] font-semibold text-white/92">
                  <button type="button" onClick={() => setView('register')} className="transition hover:text-[#ffd84d]">
                    注册账号
                  </button>
                  <span className="h-[18px] w-px bg-white/46" />
                  <button type="button" onClick={() => setView('resetVerify')} className="transition hover:text-[#ffd84d]">
                    忘记密码?
                  </button>
                </div>
              </form>
            )}

            {view === 'guest' && (
              <div className="relative flex flex-col items-center px-[7%] pb-[24px] pt-[48px] text-center">
                <div className="relative mb-[28px] h-[116px] w-[116px] [animation:guest-dice-float_3.4s_ease-in-out_infinite]">
                  <div className="absolute inset-[-16px] rounded-full border border-[#b8c3ff]/30 bg-[radial-gradient(circle,rgba(255,255,255,0.36)_0%,rgba(137,151,255,0.26)_38%,rgba(115,92,255,0)_72%)] blur-[2px] [animation:guest-dice-halo_2.6s_ease-in-out_infinite]" />
                  <div className="absolute inset-[-4px] rounded-full bg-[#735cff]/40 blur-[18px]" />
                  <div className="absolute inset-[10px] rounded-full border border-white/35 shadow-[0_0_26px_rgba(184,195,255,0.72),0_0_48px_rgba(115,92,255,0.52)]" />
                  <Image src="/images/logo-dice.png" alt="" fill sizes="104px" className="object-contain drop-shadow-[0_0_22px_rgba(255,255,255,0.68)]" />
                </div>
                <h2 className="mb-[30px] text-[clamp(20px,1.35vw,26px)] font-black leading-tight text-white">
                  无需注册，立即体验
                </h2>
                {authMessage && (
                  <p className="mb-[14px] text-center text-[clamp(12px,0.84vw,15px)] font-bold text-[#ffd84d]">
                    {authMessage}
                  </p>
                )}
                <PrimaryButton taller onClick={handleGuestLogin} disabled={isGuestLoggingIn}>
                  {isGuestLoggingIn ? '游客登录中...' : '游客进入'}
                </PrimaryButton>
              </div>
            )}

            {view === 'register' && (
              <form className={formClass}>
                <div className={registerGroupClass}>
                  <PhoneField value={phone} onChange={setPhone} />
                  <PasswordField
                    placeholder="请输入密码"
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggle={() => setShowPassword((value) => !value)}
                  />
                  <PasswordField
                    label="确认密码"
                    placeholder="请输入确认密码"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((value) => !value)}
                  />
                </div>
                <div className={registerGroupClass}>
                  <NicknameField value={nickname} onChange={setNickname} />
                  <p className="pl-[8px] text-left text-[clamp(11px,0.78vw,14px)] font-medium text-white/66">
                    用于游戏内展示，注册后可修改
                  </p>
                </div>
                {authMessage && (
                  <p className="text-center text-[clamp(12px,0.84vw,15px)] font-bold text-[#ffd84d]">
                    {authMessage}
                  </p>
                )}
                <PrimaryButton onClick={handleRegister} disabled={isRegistering}>
                  {isRegistering ? '注册中...' : '注册'}
                </PrimaryButton>
                <BottomHint text="已有账号?" action="返回登录" onClick={goLogin} />
              </form>
            )}

            {view === 'resetVerify' && (
              <form className={formClass}>
                <PhoneField />
                <CaptchaField />
                <PrimaryButton onClick={() => setView('resetPassword')}>下一步</PrimaryButton>
                <BottomHint text="想起密码了?" action="返回登录" onClick={goLogin} />
              </form>
            )}

            {view === 'resetPassword' && (
              <form className={formClass}>
                <PasswordField
                  placeholder="请输入新密码"
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />
                <PasswordField
                  label="确认密码"
                  placeholder="请确认新密码"
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((value) => !value)}
                />
                <PrimaryButton onClick={goLogin}>完成</PrimaryButton>
                <BottomHint text="重置完成后" action="返回登录" onClick={goLogin} />
              </form>
            )}

            <Agreement checked={agreed} onChange={setAgreed} />
          </div>
        </div>
      </section>
    </main>
  )
}

function Tabs({
  active,
  onChange,
}: {
  active: 'login' | 'guest'
  onChange: (view: AuthView) => void
}) {
  return (
    <div className="relative -mt-[14px] flex h-[46px] justify-center px-[10%] text-[clamp(13px,0.86vw,16px)] font-bold">
      <button
        type="button"
        onClick={() => onChange('login')}
        className={`h-full flex-1 rounded-tl-[16px] rounded-tr-[8px] border-b-0 transition duration-200 ${
          active === 'login'
            ? 'border-t border-[#8794ff]/70 bg-[linear-gradient(180deg,rgba(89,91,255,0.58)_0%,rgba(76,67,229,0.54)_42%,rgba(73,76,255,0.50)_100%)] text-white shadow-[0_0_18px_rgba(93,104,255,0.34),inset_0_1px_0_rgba(255,255,255,0.24),0_10px_18px_rgba(73,76,255,0.22)] backdrop-blur-[16px]'
            : 'border-t border-[#8794ff]/28 bg-[rgba(37,38,144,0.22)] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-[rgba(58,61,184,0.34)] hover:text-white/82'
        }`}
      >
        账号登录
      </button>
      <button
        type="button"
        onClick={() => onChange('guest')}
        className={`h-full flex-1 rounded-tl-[8px] rounded-tr-[16px] border-b-0 transition duration-200 ${
          active === 'guest'
            ? 'border-t border-[#8794ff]/70 bg-[linear-gradient(180deg,rgba(89,91,255,0.58)_0%,rgba(76,67,229,0.54)_42%,rgba(73,76,255,0.50)_100%)] text-white shadow-[0_0_18px_rgba(93,104,255,0.34),inset_0_1px_0_rgba(255,255,255,0.24),0_10px_18px_rgba(73,76,255,0.22)] backdrop-blur-[16px]'
            : 'border-t border-[#8794ff]/28 bg-[rgba(37,38,144,0.22)] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-[rgba(58,61,184,0.34)] hover:text-white/82'
        }`}
      >
        游客登录
      </button>
    </div>
  )
}

function PanelTitle({ title, purple = false }: { title: string; purple?: boolean }) {
  return (
    <div className="relative -mt-[14px] flex h-[46px] items-center justify-center px-[25%] text-[clamp(13px,0.86vw,16px)] font-bold">
      <div
        className={`flex h-full w-full items-center justify-center rounded-t-[16px] border border-b-0 border-[#8794ff]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ${
          purple
            ? 'bg-[linear-gradient(180deg,rgba(95,91,255,0.62)_0%,rgba(92,59,217,0.58)_100%)] text-white'
            : 'bg-[rgba(48,50,166,0.3)] text-white'
        }`}
      >
        <span className="text-center">{title}</span>
      </div>
    </div>
  )
}

function PhoneField({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  return (
    <LoginField icon={<Smartphone aria-hidden className="h-[22px] w-[22px]" />} label="手机号">
      <input
        type="tel"
        placeholder="请输入手机号"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={inputClass}
      />
    </LoginField>
  )
}

function PasswordField({
  label = '密码',
  placeholder,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label?: string
  placeholder: string
  value?: string
  onChange?: (value: string) => void
  visible: boolean
  onToggle: () => void
}) {
  return (
    <LoginField icon={<Lock aria-hidden className="h-[22px] w-[22px]" />} label={label}>
      <input
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={inputClass}
      />
      <button
        type="button"
        onClick={onToggle}
        className="mr-[18px] flex h-full w-[38px] shrink-0 items-center justify-center text-[#222982] transition hover:text-[#5d35ff]"
        aria-label={visible ? '隐藏密码' : '显示密码'}
      >
        {visible ? <Eye className="h-[21px] w-[21px]" /> : <EyeOff className="h-[21px] w-[21px]" />}
      </button>
    </LoginField>
  )
}

function NicknameField({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  return (
    <LoginField icon={<UserRound aria-hidden className="h-[22px] w-[22px]" />} label="昵称">
      <input
        type="text"
        placeholder="请输入唯一昵称"
        name="nickname"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={inputClass}
      />
    </LoginField>
  )
}

function CaptchaField() {
  return (
    <LoginField icon={<ShieldCheck aria-hidden className="h-[22px] w-[22px]" />} label="验证码">
      <input type="text" placeholder="请输入验证码" className={inputClass} />
      <div className="mr-[12px] flex h-[42px] w-[18%] shrink-0 items-center justify-center rounded-[8px] bg-white/80 text-[clamp(13px,1.1vw,21px)] font-black tracking-[0.18em] text-[#1b236b]">
        8427
      </div>
      <button
        type="button"
        className="mr-[10px] flex h-full w-[32px] shrink-0 items-center justify-center text-[#2c36bd] transition hover:text-[#5d35ff]"
        aria-label="刷新验证码"
      >
        <RefreshCw className="h-[20px] w-[20px] stroke-[3]" />
      </button>
    </LoginField>
  )
}

function LoginField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="group flex h-[62px] items-center rounded-[9px] bg-white/90 text-[#12195f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.65)] transition duration-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#8997ff]/75">
      <div className="flex h-full w-[32%] min-w-[118px] items-center gap-[18px] pl-[4.2%] text-[clamp(13px,0.92vw,17px)] font-black text-[#141a66]">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function PrimaryButton({
  children,
  taller = false,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  taller?: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[9px] bg-[linear-gradient(180deg,#ffe36a_0%,#ffc400_48%,#ffad00_100%)] text-[clamp(15px,1vw,18px)] font-black text-[#1c1400] shadow-[0_8px_24px_rgba(255,190,0,0.42),inset_0_1px_0_rgba(255,255,255,0.68)] transition duration-200 hover:-translate-y-[2px] hover:brightness-105 active:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 ${
        taller ? 'h-[62px]' : 'h-[62px]'
      }`}
    >
      {children}
    </button>
  )
}

function BottomHint({
  text,
  action,
  onClick,
}: {
  text: string
  action: string
  onClick: () => void
}) {
  return (
    <p className="text-center text-[clamp(12px,0.84vw,15px)] font-semibold text-white/78">
      {text}
      <button type="button" onClick={onClick} className="ml-[6px] text-[#ffd84d] transition hover:text-white">
        {action}
      </button>
    </p>
  )
}

function Agreement({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="relative mx-auto mb-[28px] mt-[2px] flex w-max max-w-[88%] cursor-pointer items-center justify-center gap-[8px] text-[clamp(12px,0.82vw,15px)] font-bold text-white/90">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border border-white/80 bg-transparent peer-checked:border-[#7f7cff] peer-checked:bg-[#6c58ff]">
        {checked && (
          <svg viewBox="0 0 12 12" className="h-[10px] w-[10px] text-white">
            <path d="M2.2 6.1 4.8 8.5 9.8 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="whitespace-nowrap">
        我已阅读并同意
        <span className="text-[#ffd84d]">《用户协议》</span>
        和
        <span className="text-[#ffd84d]">《隐私政策》</span>
      </span>
    </label>
  )
}
