# 银河大乐骰 - 登录页面

## 项目说明

这是一个使用 Next.js 14 + TailwindCSS + Framer Motion 实现的登录页面，高度还原了 Figma 设计稿。

## 技术栈

- **React 18**
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Framer Motion**
- **CSS Modules**

## 文件结构

```
app/(auth)/login/
├── page.tsx          # 主登录页面组件
└── login.module.css  # CSS 模块样式文件
```

## 功能特性

### 1. Tab 切换
- 账号登录 / 游客登录
- 平滑的切换动画
- 活跃指示器

### 2. 表单输入
- 手机号输入框
- 密码输入框（带密码显示切换）
- 验证码输入框（带刷新功能）
- Focus 状态样式

### 3. 动画效果
- 页面渐入动画
- Logo 呼吸发光效果
- 卡片入场动画
- Tab 切换动画
- 按钮悬停效果
- 输入框聚焦动画

### 4. 视觉效果
- 星空背景
- Glassmorphism 卡片
- 紫色边框发光
- 黄色渐变按钮
- 毛玻璃效果

## 设计规范

### 颜色系统
- 主色调：紫色 (#6B46C1)
- 背景色：深紫色渐变
- 按钮色：黄色渐变 (#FFD700 → #FFA500)
- 文字色：白色为主

### 间距系统
- 卡片圆角：32px
- 输入框高度：72px
- 内边距：40px
- 元素间距：32px

### 字体层级
- 标题：32px / Bold
- 正文：18px / Medium
- 辅助文字：15px / Regular

## 使用方法

1. 启动开发服务器：
```bash
npm run dev
```

2. 访问登录页面：
```
http://localhost:3000/login
```

## 依赖项

```json
{
  "framer-motion": "^10.16.4"
}
```

## 注意事项

1. 所有图片资源放在 `public/images/login/` 目录下
2. CSS Module 的样式命名使用 camelCase
3. 动画效果使用 Framer Motion 实现
4. 保持与 Figma 设计稿的一致性

## 开发指南

### 添加新动画
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  <!-- 内容 -->
</motion.div>
```

### 添加新样式
```css
/* login.module.css */
.new-style {
  /* 样式定义 */
}
```

### 在组件中使用
```tsx
import styles from './login.module.css'

// ...
className={styles.new-style}
```