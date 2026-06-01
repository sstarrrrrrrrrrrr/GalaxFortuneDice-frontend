# AGENTS.md

## Next.js 版本提醒

# 这不是你记忆里的旧版 Next.js

本项目使用 Next.js 16.2.6。它的 API、约定和文件结构可能与旧版本不同。修改框架行为、路由、中间件、代理、服务端组件、客户端组件、元数据或构建配置前，必须先阅读 `node_modules/next/dist/docs/` 中对应的官方文档，并注意废弃提示。

## 项目概况

- 项目名称：银河大乐骰
- 框架：Next.js App Router
- 运行栈：React 19 + TypeScript
- 样式：Tailwind CSS
- 动画：Framer Motion
- 图标：Lucide React
- 接口请求：Axios
- 状态管理：优先使用 React 本地状态，只有跨页面或跨核心功能共享时才使用 Zustand
- 包管理器：npm

## 目录结构

```text
app/
  (auth)/login/              # 登录、注册、游客入口
  (main)/lobby/              # 首页大厅
  (main)/ranking/            # 排行榜
  (main)/profile/            # 个人中心
  (room)/room/[roomId]/      # 房间等待页
  (game)/game/[matchId]/     # 对局页
  (game)/game/[matchId]/vs/  # VS 过场页

components/                  # 公共组件
services/                    # 接口请求封装
hooks/                       # 自定义 Hooks
types/                       # TypeScript 类型
constants/                   # 常量
utils/                       # 工具函数
websocket/                   # WebSocket 封装
public/images/               # 静态图片资源
```

## 硬性规则

- 不要编辑 `.next/`、`node_modules/`、`dist/`、`build/`。
- 不要提交或依赖构建产物。
- 处理单一需求时，不要重写无关文件。
- 不要删除用户已有改动，除非用户明确要求。
- 大厅、房间、VS 过场页、对局页之间必须保持模式参数传递完整。

## 编码规范

- 使用 TypeScript，共享契约必须保持类型清晰。
- 组件属性和领域对象优先使用 `interface`。
- 使用函数组件和 React Hooks。
- 组件命名使用 `PascalCase`。
- Hook 命名使用 `useXxx`。
- 状态优先放在组件本地，确实需要共享时再提升或接入状态库。
- 新增代码前，优先复用已有组件、Hook、服务、类型和视觉模式。
- 避免使用 `any`、`@ts-ignore` 和过宽的类型断言。
- 不使用 Class Component。
- 不做无关抽象，不做无关重构。

## Next.js 使用规范

- 默认使用服务端组件；只有需要状态、事件、浏览器 API 或副作用时才添加 `'use client'`。
- 修改 App Router 相关行为前，先查阅 `node_modules/next/dist/docs/`。
- 处理路由保护时，需要考虑根目录 `proxy.ts` / middleware 的行为。
- 本地图片资源优先使用 `next/image`。

## 界面风格

核心视觉语言：

- 银河
- 科幻
- 霓虹
- 玻璃拟态
- 蓝紫为主色
- 黄色为主要行动按钮强调色

界面约束：

- 登录页、首页大厅、房间页、VS 页、对局页的卡片和面板风格要统一。
- 不要让所有元素都发光、都抢眼；必须保留视觉主次。
- 有合适图标时，优先使用 Lucide React。
- 按钮、输入框和文字必须在常见桌面宽度下清晰可读。
- 避免文字、控件和动效互相遮挡。

## 游戏规则

- 每局 13 轮。
- 每回合最多投掷 3 次。
- 每次投掷 5 颗骰子。
- 玩家可以锁定骰子。
- 正式骰子结果由后端生成。
- 正式分数由后端校验。
- 最终胜负由后端计算。
- 前端只负责展示、交互、临时状态和接口接入前的静态占位效果。

禁止事项：

- 接入后端后，不得用 `Math.random()` 生成正式游戏结果。
- 不得以前端计算结果作为最终胜负来源。
- 不得篡改或重新解释后端返回的游戏结果。

## 接口与 WebSocket

- 接口请求统一放在 `services/`。
- 对应领域已有服务层时，页面中不要直接调用 Axios。
- 使用 `async/await`。
- 请求失败必须显式处理。
- WebSocket 创建和消息处理统一放在 `websocket/`。
- 页面中不要直接调用 `new WebSocket()`。
- WebSocket 消息类型优先使用明确的类型或枚举。

## 常用命令

```bash
npm install
npm run dev
npm run lint
npm run build
```

## 验证要求

代码改动后：

- 条件允许时运行 `npm run lint`。
- 涉及路由、页面、类型或框架行为时运行 `npm run build`。
- 如存在与本次任务无关的警告，需要在交付说明里说明。

## 协作流程

改动代码时：

- 先阅读相关文件，再编辑。
- 遵循现有目录结构和视觉语言。
- 改动范围保持聚焦，不扩散到无关模块。
- 优先写小而清晰的组件。
- 不改变用户没有要求变更的行为。
- 做界面相关工作时，要特别确认不同模式下的玩家数量、组队/非组队逻辑是否正确。
