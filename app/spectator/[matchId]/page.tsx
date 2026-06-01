export default function SpectatorPage({ params }: { params: { matchId: string } }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-white">观战游戏 {params.matchId}</h1>
        <p className="mt-1 text-gray-400">实时观战中</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        {/* Spectator view will be implemented here */}
        <div className="bg-gray-700 p-8 rounded-lg max-w-6xl w-full">
          <div className="text-center mb-8">
            <p className="text-gray-300">观战视图待实现</p>
            <p className="text-sm text-gray-500 mt-2">实时游戏进度将显示在这里</p>
          </div>
          {/* Game board for spectator */}
          <div className="bg-gray-800 p-6 rounded">
            <p className="text-gray-400">游戏桌面视图待实现</p>
          </div>
        </div>
      </div>
    </div>
  )
}