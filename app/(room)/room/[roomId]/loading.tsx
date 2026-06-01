export default function RoomLoading() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[#08031a]">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin mx-auto" />
        <p className="mt-4 text-[14px] text-white/40">加载房间中...</p>
      </div>
    </div>
  )
}
