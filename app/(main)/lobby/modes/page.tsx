import { PageExitButton } from '@/components/PageExitButton'

export default function ModesPage() {
  return (
    <main className="relative min-h-screen space-y-8 bg-[#05072c] px-8 py-10 text-white">
      <PageExitButton className="absolute left-6 top-6 z-10" />

      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">游戏模式</h1>
        <p className="mt-2 text-white/65">选择你喜欢的游戏模式</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mode cards will be implemented here */}
        <div className="rounded-lg border border-white/15 bg-[#071052]/70 p-6 shadow-md">
          <h3 className="text-xl font-semibold text-white">2人混战</h3>
          <p className="mt-2 text-white/65">经典1v1对战</p>
        </div>
        <div className="rounded-lg border border-white/15 bg-[#071052]/70 p-6 shadow-md">
          <h3 className="text-xl font-semibold text-white">3人混战</h3>
          <p className="mt-2 text-white/65">三方混战模式</p>
        </div>
        <div className="rounded-lg border border-white/15 bg-[#071052]/70 p-6 shadow-md">
          <h3 className="text-xl font-semibold text-white">4人混战</h3>
          <p className="mt-2 text-white/65">四方混战模式</p>
        </div>
        <div className="rounded-lg border border-white/15 bg-[#071052]/70 p-6 shadow-md">
          <h3 className="text-xl font-semibold text-white">2v2团队</h3>
          <p className="mt-2 text-white/65">团队对抗模式</p>
        </div>
        <div className="rounded-lg border border-white/15 bg-[#071052]/70 p-6 shadow-md">
          <h3 className="text-xl font-semibold text-white">自定义房间</h3>
          <p className="mt-2 text-white/65">自定义游戏规则</p>
        </div>
      </div>
    </main>
  )
}
