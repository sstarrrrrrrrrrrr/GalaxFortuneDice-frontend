export default function ModesPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">游戏模式</h1>
        <p className="mt-2 text-gray-600">选择你喜欢的游戏模式</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mode cards will be implemented here */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">2人混战</h3>
          <p className="mt-2 text-gray-600">经典1v1对战</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">3人混战</h3>
          <p className="mt-2 text-gray-600">三方混战模式</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">4人混战</h3>
          <p className="mt-2 text-gray-600">四方混战模式</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">2v2团队</h3>
          <p className="mt-2 text-gray-600">团队对抗模式</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">自定义房间</h3>
          <p className="mt-2 text-gray-600">自定义游戏规则</p>
        </div>
      </div>
    </div>
  )
}