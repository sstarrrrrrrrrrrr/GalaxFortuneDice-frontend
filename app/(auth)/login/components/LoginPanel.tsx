import type { ReactNode } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Lock, RefreshCw, ShieldCheck, Smartphone, UserRound } from 'lucide-react'

export type AuthView = 'login' | 'guest' | 'register' | 'resetVerify' | 'resetPassword'

interface LoginPanelProps {
  view: AuthView
  onViewChange: (view: AuthView) => void
  onBackToLogin: () => void
  phone: string
  onPhoneChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  confirmPassword: string
  onConfirmPasswordChange: (value: string) => void
  nickname: string
  onNicknameChange: (value: string) => void
  showPassword: boolean
  onTogglePassword: () => void
  showConfirmPassword: boolean
  onToggleConfirmPassword: () => void
  agreed: boolean
  onAgreedChange: (checked: boolean) => void
  authMessage: string
  isLoggingIn: boolean
  isGuestLoggingIn: boolean
  isRegistering: boolean
  onAccountLogin: () => void
  onGuestLogin: () => void
  onRegister: () => void
}

const inputClass =
  'h-full min-w-0 flex-1 bg-transparent px-[22px] text-[clamp(14px,0.95vw,17px)] font-medium text-[#1d236f] outline-none placeholder:text-[#a7b2ee]'

const formClass = 'relative flex flex-col gap-[22px] px-[7%] pb-[18px] pt-[34px]'
const registerGroupClass = 'flex flex-col gap-[17px]'

// 渲染登录页主面板，根据当前视图切换登录、游客、注册和找回密码表单。
export function LoginPanel({
  view,
  onViewChange,
  onBackToLogin,
  phone,
  onPhoneChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  nickname,
  onNicknameChange,
  showPassword,
  onTogglePassword,
  showConfirmPassword,
  onToggleConfirmPassword,
  agreed,
  onAgreedChange,
  authMessage,
  isLoggingIn,
  isGuestLoggingIn,
  isRegistering,
  onAccountLogin,
  onGuestLogin,
  onRegister,
}: LoginPanelProps) {
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
              <Tabs active={view} onChange={onViewChange} />
            ) : (
              <PanelTitle
                title={view === 'register' ? '注册账号' : view === 'resetVerify' ? '找回密码' : '重置密码'}
                purple={view === 'register'}
              />
            )}

            {view === 'login' && (
              <LoginForm
                phone={phone}
                onPhoneChange={onPhoneChange}
                password={password}
                onPasswordChange={onPasswordChange}
                showPassword={showPassword}
                onTogglePassword={onTogglePassword}
                authMessage={authMessage}
                isLoggingIn={isLoggingIn}
                onAccountLogin={onAccountLogin}
                onRegisterClick={() => onViewChange('register')}
                onResetClick={() => onViewChange('resetVerify')}
              />
            )}

            {view === 'guest' && (
              <GuestLoginPanel
                authMessage={authMessage}
                isGuestLoggingIn={isGuestLoggingIn}
                onGuestLogin={onGuestLogin}
              />
            )}

            {view === 'register' && (
              <RegisterForm
                phone={phone}
                onPhoneChange={onPhoneChange}
                password={password}
                onPasswordChange={onPasswordChange}
                confirmPassword={confirmPassword}
                onConfirmPasswordChange={onConfirmPasswordChange}
                nickname={nickname}
                onNicknameChange={onNicknameChange}
                showPassword={showPassword}
                onTogglePassword={onTogglePassword}
                showConfirmPassword={showConfirmPassword}
                onToggleConfirmPassword={onToggleConfirmPassword}
                authMessage={authMessage}
                isRegistering={isRegistering}
                onRegister={onRegister}
                onBackToLogin={onBackToLogin}
              />
            )}

            {view === 'resetVerify' && (
              <ResetVerifyForm onNext={() => onViewChange('resetPassword')} onBackToLogin={onBackToLogin} />
            )}

            {view === 'resetPassword' && (
              <ResetPasswordForm
                showPassword={showPassword}
                onTogglePassword={onTogglePassword}
                showConfirmPassword={showConfirmPassword}
                onToggleConfirmPassword={onToggleConfirmPassword}
                onBackToLogin={onBackToLogin}
              />
            )}

            <Agreement checked={agreed} onChange={onAgreedChange} />
          </div>
        </div>
      </section>
    </main>
  )
}

interface LoginFormProps {
  phone: string
  onPhoneChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  showPassword: boolean
  onTogglePassword: () => void
  authMessage: string
  isLoggingIn: boolean
  onAccountLogin: () => void
  onRegisterClick: () => void
  onResetClick: () => void
}

// 渲染账号密码登录表单，并暴露登录、注册和找回密码入口。
function LoginForm({
  phone,
  onPhoneChange,
  password,
  onPasswordChange,
  showPassword,
  onTogglePassword,
  authMessage,
  isLoggingIn,
  onAccountLogin,
  onRegisterClick,
  onResetClick,
}: LoginFormProps) {
  return (
    <form className={formClass}>
      <PhoneField value={phone} onChange={onPhoneChange} />
      <PasswordField
        placeholder="请输入密码"
        value={password}
        onChange={onPasswordChange}
        visible={showPassword}
        onToggle={onTogglePassword}
      />
      {authMessage && <AuthMessage>{authMessage}</AuthMessage>}
      <PrimaryButton onClick={onAccountLogin} disabled={isLoggingIn}>
        {isLoggingIn ? '登录中...' : '登录'}
      </PrimaryButton>
      <div className="flex items-center justify-center gap-[13%] pt-[4px] text-[clamp(13px,0.9vw,16px)] font-semibold text-white/92">
        <button type="button" onClick={onRegisterClick} className="transition hover:text-[#ffd84d]">
          注册账号
        </button>
        <span className="h-[18px] w-px bg-white/46" />
        <button type="button" onClick={onResetClick} className="transition hover:text-[#ffd84d]">
          忘记密码?
        </button>
      </div>
    </form>
  )
}

// 渲染游客入口面板，展示游客说明、反馈信息和游客登录按钮。
function GuestLoginPanel({
  authMessage,
  isGuestLoggingIn,
  onGuestLogin,
}: {
  authMessage: string
  isGuestLoggingIn: boolean
  onGuestLogin: () => void
}) {
  return (
    <div className="relative flex flex-col items-center px-[7%] pb-[24px] pt-[48px] text-center">
      <div className="relative mb-[28px] h-[116px] w-[116px] [animation:guest-dice-float_3.4s_ease-in-out_infinite]">
        <div className="absolute inset-[-16px] rounded-full border border-[#b8c3ff]/30 bg-[radial-gradient(circle,rgba(255,255,255,0.36)_0%,rgba(137,151,255,0.26)_38%,rgba(115,92,255,0)_72%)] blur-[2px] [animation:guest-dice-halo_2.6s_ease-in-out_infinite]" />
        <div className="absolute inset-[-4px] rounded-full bg-[#735cff]/40 blur-[18px]" />
        <div className="absolute inset-[10px] rounded-full border border-white/35 shadow-[0_0_26px_rgba(184,195,255,0.72),0_0_48px_rgba(115,92,255,0.52)]" />
        <Image
          src="/images/logo-dice.png"
          alt=""
          fill
          sizes="104px"
          className="object-contain drop-shadow-[0_0_22px_rgba(255,255,255,0.68)]"
        />
      </div>
      <h2 className="mb-[30px] text-[clamp(20px,1.35vw,26px)] font-black leading-tight text-white">
        无需注册，立即体验
      </h2>
      {authMessage && <AuthMessage className="mb-[14px]">{authMessage}</AuthMessage>}
      <PrimaryButton taller onClick={onGuestLogin} disabled={isGuestLoggingIn}>
        {isGuestLoggingIn ? '游客登录中...' : '游客进入'}
      </PrimaryButton>
    </div>
  )
}

interface RegisterFormProps {
  phone: string
  onPhoneChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  confirmPassword: string
  onConfirmPasswordChange: (value: string) => void
  nickname: string
  onNicknameChange: (value: string) => void
  showPassword: boolean
  onTogglePassword: () => void
  showConfirmPassword: boolean
  onToggleConfirmPassword: () => void
  authMessage: string
  isRegistering: boolean
  onRegister: () => void
  onBackToLogin: () => void
}

// 渲染注册表单，收集手机号、密码、确认密码和昵称。
function RegisterForm({
  phone,
  onPhoneChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  nickname,
  onNicknameChange,
  showPassword,
  onTogglePassword,
  showConfirmPassword,
  onToggleConfirmPassword,
  authMessage,
  isRegistering,
  onRegister,
  onBackToLogin,
}: RegisterFormProps) {
  return (
    <form className={formClass}>
      <div className={registerGroupClass}>
        <PhoneField value={phone} onChange={onPhoneChange} />
        <PasswordField
          placeholder="请输入密码"
          value={password}
          onChange={onPasswordChange}
          visible={showPassword}
          onToggle={onTogglePassword}
        />
        <PasswordField
          label="确认密码"
          placeholder="请输入确认密码"
          value={confirmPassword}
          onChange={onConfirmPasswordChange}
          visible={showConfirmPassword}
          onToggle={onToggleConfirmPassword}
        />
      </div>
      <div className={registerGroupClass}>
        <NicknameField value={nickname} onChange={onNicknameChange} />
        <p className="pl-[8px] text-left text-[clamp(11px,0.78vw,14px)] font-medium text-white/66">
          用于游戏内展示，注册后可修改
        </p>
      </div>
      {authMessage && <AuthMessage>{authMessage}</AuthMessage>}
      <PrimaryButton onClick={onRegister} disabled={isRegistering}>
        {isRegistering ? '注册中...' : '注册'}
      </PrimaryButton>
      <BottomHint text="已有账号?" action="返回登录" onClick={onBackToLogin} />
    </form>
  )
}

// 渲染找回密码的验证码校验步骤。
function ResetVerifyForm({ onNext, onBackToLogin }: { onNext: () => void; onBackToLogin: () => void }) {
  return (
    <form className={formClass}>
      <PhoneField />
      <CaptchaField />
      <PrimaryButton onClick={onNext}>下一步</PrimaryButton>
      <BottomHint text="想起密码了?" action="返回登录" onClick={onBackToLogin} />
    </form>
  )
}

// 渲染找回密码的新密码设置步骤。
function ResetPasswordForm({
  showPassword,
  onTogglePassword,
  showConfirmPassword,
  onToggleConfirmPassword,
  onBackToLogin,
}: {
  showPassword: boolean
  onTogglePassword: () => void
  showConfirmPassword: boolean
  onToggleConfirmPassword: () => void
  onBackToLogin: () => void
}) {
  return (
    <form className={formClass}>
      <PasswordField placeholder="请输入新密码" visible={showPassword} onToggle={onTogglePassword} />
      <PasswordField
        label="确认密码"
        placeholder="请确认新密码"
        visible={showConfirmPassword}
        onToggle={onToggleConfirmPassword}
      />
      <PrimaryButton onClick={onBackToLogin}>完成</PrimaryButton>
      <BottomHint text="重置完成后" action="返回登录" onClick={onBackToLogin} />
    </form>
  )
}

// 渲染登录方式切换标签，只在账号登录和游客入口之间切换。
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

// 渲染注册/找回密码等非标签页场景的面板标题。
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

// 渲染手机号输入框。
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

// 渲染密码输入框，并处理明文/密文切换按钮。
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

// 渲染昵称输入框。
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

// 渲染找回密码流程中的验证码输入区域。
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

// 渲染带图标和标签的通用登录字段容器。
function LoginField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
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

// 渲染登录页主操作按钮，统一提交按钮视觉。
function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode
  taller?: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[62px] w-full rounded-[9px] bg-[linear-gradient(180deg,#ffe36a_0%,#ffc400_48%,#ffad00_100%)] text-[clamp(15px,1vw,18px)] font-black text-[#1c1400] shadow-[0_8px_24px_rgba(255,190,0,0.42),inset_0_1px_0_rgba(255,255,255,0.68)] transition duration-200 hover:-translate-y-[2px] hover:brightness-105 active:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {children}
    </button>
  )
}

// 渲染表单底部的提示文案和跳转操作。
function BottomHint({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <p className="text-center text-[clamp(12px,0.84vw,15px)] font-semibold text-white/78">
      {text}
      <button type="button" onClick={onClick} className="ml-[6px] text-[#ffd84d] transition hover:text-white">
        {action}
      </button>
    </p>
  )
}

// 渲染认证流程中的错误或状态提示文案。
function AuthMessage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-center text-[clamp(12px,0.84vw,15px)] font-bold text-[#ffd84d] ${className}`}>
      {children}
    </p>
  )
}

// 渲染用户协议勾选区域，并把勾选状态同步给页面容器。
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
            <path
              d="M2.2 6.1 4.8 8.5 9.8 3.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
