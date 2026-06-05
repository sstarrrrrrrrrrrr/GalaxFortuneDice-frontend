'use client'

import Image from 'next/image'
import { UserRound } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { DEFAULT_AVATAR_SRC } from '@/utils/avatar'

export default function ProfilePage() {
  const currentUser = useCurrentUser()
  const nickname = currentUser?.nickname ?? '未登录'
  const avatar = currentUser?.avatar || DEFAULT_AVATAR_SRC
  const phone = currentUser?.phone || '未登录'
  const exp = currentUser?.exp ?? 0

  return (
    <main className="min-h-screen bg-[#05072c] px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[14px] border border-white/14 bg-[#071052]/70 shadow-[0_18px_36px_rgba(2,5,42,0.34)] backdrop-blur-[12px]">
        <div className="flex items-center gap-4 border-b border-white/10 px-6 py-5">
          <UserRound className="h-6 w-6 text-[#ffd84d]" />
          <h1 className="text-xl font-black">我的资料</h1>
        </div>
        <div className="flex items-center gap-5 px-6 py-7">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/28 bg-[#15156a] shadow-[0_0_18px_rgba(114,129,255,0.46)]">
            <Image src={avatar} alt={nickname} fill sizes="96px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-2xl font-black">{nickname}</div>
            <div className="mt-2 text-sm font-bold text-white/64">{phone}</div>
            <div className="mt-3 text-sm font-bold text-[#ffd84d]">EXP {exp}</div>
          </div>
        </div>
      </section>
    </main>
  )
}
