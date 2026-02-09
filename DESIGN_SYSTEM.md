# V2Ray Simple VPN - UI/UX 设计规范与动画指南

本文档总结了本项目中使用的高保真移动端 UI 设计系统。该系统基于 **Material Design** 理念，结合 **Cyberpunk/Neon** 风格的微交互动画，旨在提供流畅、沉浸式的原生应用体验。

---

## 1. 核心视觉体系 (Visual Identity)

### 1.1 色彩系统 (Color Palette)
应用采用深色模式（Dark Mode）为基调，利用高饱和度的霓虹色作为状态指示。

| 语义 (Semantics) | 颜色代码 (Hex/Tailwind) | 用途 |
| :--- | :--- | :--- |
| **Surface (背景)** | `#0f172a` (Slate 900) | 全局背景，深度感基底 |
| **Card (卡片)** | `#1e293b` (Slate 800) | 内容容器，服务器列表项 |
| **Primary (主色)** | `#3b82f6` (Blue 500) | 按钮，选中状态，下载数据 |
| **Success (连接)** | `#10b981` (Emerald 500) | 已连接状态，低延迟 Ping 值 |
| **Warning (连接中)** | `#eab308` (Yellow 500) | 连接过程，中等延迟，上传数据 |
| **Danger (错误)** | `#ef4444` (Red 500) | 断开连接，高延迟 |

### 1.2 字体排印 (Typography)
使用 `Inter` 字体家族，强调数字的可读性和层级感。

*   **Display:** 32px/Bold (速度仪表盘数值)
*   **Heading:** 24px/Bold (页面标题)
*   **Body:** 14px/Regular (列表内容)
*   **Caption:** 12px/Medium (标签，状态说明，全大写+宽字距 `tracking-widest`)
*   **Mono:** `font-mono` (延迟数值，IP地址)

---

## 2. 核心动画与交互 (Animations & Interactions)

本项目的一大亮点是利用 CSS 和 SVG 实现的流畅动画。以下是核心动画的实现逻辑与设计复刻指南。

### 2.1 呼吸与涟漪效果 (The Breathing Ripple)
**应用场景：** 主页巨大的连接按钮。
**设计意图：** 模拟生物体的“心跳”或雷达扫描，暗示应用正在活跃工作或搜索服务器。

*   **Tailwind 实现：**
    ```jsx
    // 外层光晕：扩散 + 呼吸
    <div className="absolute w-48 h-48 bg-emerald-500/20 rounded-full animate-pulse scale-125" />
    
    // 内层光晕：高斯模糊
    <div className="absolute w-40 h-40 bg-emerald-500/30 rounded-full blur-xl" />
    ```
*   **Figma 设计指南：**
    1.  创建三个同心圆。
    2.  最底层圆：设置 `Layer Blur` (20-40)，透明度 20%。
    3.  中间层圆：设置 `Layer Blur` (10)，透明度 30%。
    4.  交互：使用 "After Delay" 循环触发 "Smart Animate"，改变圆的大小 (Scale) 和透明度 (Opacity)。

### 2.2 仪表盘指针动画 (Gauge Rotation)
**应用场景：** 测速页面。
**设计意图：** 实时反馈网络吞吐量，增强科技感。

*   **代码逻辑：**
    通过 CSS Transform 动态计算旋转角度。
    ```jsx
    // rotation 计算逻辑：将 0-100Mbps 映射到 -90deg 到 90deg
    const rotation = Math.min(speed, 100) * 1.8 - 90;
    
    <div 
      className="transition-all duration-1000 ease-out" 
      style={{ transform: `rotate(${rotation}deg)` }} 
    />
    ```
*   **Figma 设计指南：**
    1.  绘制圆环：使用 Arc 工具，设置 Sweep 为 50% (半圆)。
    2.  指针/进度条：使用 Angular Gradient（角度渐变）作为蒙版，或者简单的旋转组件。
    3.  原型：设置变量 `rotation`，并绑定到组件的旋转属性。

### 2.3 触摸反馈 (Haptic Visuals)
**应用场景：** 所有可点击的按钮、列表项。
**设计意图：** 在没有物理触感的屏幕上提供操作确认。

*   **Tailwind 实现：**
    ```css
    /* 点击时缩小 */
    active:scale-95 transition-transform duration-200
    ```
*   **Figma 设计指南：**
    *   为组件添加 "While Pressing" (按下时) 状态。
    *   在按下状态中，将组件大小缩放至 95% 或 98%。

### 2.4 骨架屏与加载态 (Skeletons & Spinners)
**应用场景：** 连接过程中，或数据加载时。

*   **Tailwind 实现：**
    *   **旋转圆环：** `animate-spin` (CSS keyframe rotate)。
    *   **渐显内容：** `animate-fade-in` (opacity 0 -> 1)。

---

## 3. UI 组件模式 (Component Patterns)

### 3.1 玻璃拟态卡片 (Glassmorphism Cards)
用于选中的节点展示或浮层。
*   **CSS:** `bg-slate-800/80 backdrop-blur-md border-slate-700`
*   **效果：** 背景半透明 + 背景模糊 + 细边框。这能让内容与背景分离，产生层级感（Elevation）。

### 3.2 底部导航栏 (Bottom Navigation)
*   **布局：** 固定在底部，高度 `h-16`。
*   **状态：**
    *   **Active:** 图标高亮 (Blue-400)，文字高亮。
    *   **Inactive:** 图标灰色 (Slate-500)，文字灰色。
*   **交互区域：** 即使图标很小，点击热区应覆盖整个高度和宽度的 1/4 区域，确保手指容易点击。

### 3.3 列表项 (List Items)
用于服务器列表。
*   **选中态：** 边框变色 (`border-blue-500`) + 背景微亮 (`bg-blue-600/10`) + 指示点 (`Radio Button`) 激活。
*   **旗帜/Emoji：** 使用大字号 (text-2xl/3xl) 增强视觉识别度，无需加载外部图片资源。

---

## 4. 动画参数参考 (Animation Timing)

为了保持原生应用的流畅感，建议遵循以下时间函数：

| 动画类型 | 持续时间 (Duration) | 缓动函数 (Easing) | 场景 |
| :--- | :--- | :--- | :--- |
| **Micro (点击)** | 100ms - 200ms | `ease-out` | 按钮缩放，Switch开关 |
| **Enter (进场)** | 300ms - 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 页面切换，弹窗弹出 |
| **State (状态)** | 700ms - 1000ms | `linear` / `ease-in-out` | 呼吸灯，颜色过渡 |
| **Data (仪表盘)** | 1000ms+ | `ease-out` | 测速指针摆动（需要平滑阻尼感） |

---

## 5. 总结

本设计系统的核心在于 **"暗色底 + 亮色光"** 的对比。
1.  **不要使用纯黑** (`#000000`) 作为背景，使用深蓝灰 (`#0f172a`) 会让界面更有质感。
2.  **阴影 (Shadows)** 在深色模式下作用较弱，应更多使用 **发光 (Glow/Drop Shadow with color)** 和 **边框 (Border)** 来区分层级。
3.  **动画** 是区分"网页"和"应用"的关键。每一个状态改变（连接、断开、切换页面）都应该有平滑的过渡，而不是突变。
