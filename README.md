# 银河大乐骰

银河、科幻、霓虹风格的多人骰子对战前端项目。

## 技术栈

- Next.js 16.2.6 App Router
- React 19 + TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- Axios
- Zustand

## 主要页面

- `/login`：账号登录、注册、游客登录
- `/lobby`：大厅、创建房间、加入房间
- `/room/[roomId]`：房间等待页
- `/game/[matchId]/vs`：VS 过场页
- `/game/[matchId]`：对局页
- `/ranking/overall`：排行榜
- `/profile/me`：个人中心
- `/spectator/[matchId]`：观战页

## 本地运行

```bash
npm install
npm run dev
```

默认访问：

```text
http://localhost:3000/login
```

开发环境可临时绕过登录进入大厅：

```text
http://localhost:3000/lobby?dev=true
```

## 常用命令

```bash
npm run lint
npm run build
npm run start
```

## 游戏规则

- 每局 13 轮。
- 每回合最多投掷 3 次。
- 每次投掷 5 颗骰子。
- 玩家可以锁定骰子。
- 正式骰子结果、正式分数和最终胜负由后端决定。

## 项目约定

- 接口请求放在 `services/`。
- WebSocket 封装放在 `websocket/`。
- 本地图片优先使用 `next/image`。
- 大厅、房间、VS、对局之间需要保持模式参数传递完整。
