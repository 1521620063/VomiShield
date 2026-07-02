# VomiShield 🛡️

[中文](README.md) | [English](README.en.md)

VomiShield 是一个基于 **Tauri + React + TypeScript** 的桌面视觉锚点工具。它会在窗口化或无边框全屏游戏上方显示轻量、可调节的辅助 Overlay，为 3D 游戏中的晕动不适提供更稳定的视觉参考。

> 说明：VomiShield 不注入游戏进程、不 Hook 图形 API、不读取内存，也不承诺医疗效果。它只是一个外部桌面覆盖层工具。

## ✨ 功能亮点

- 🎯 多种视觉锚点：十字准星、中心环、全屏辅助线、水平线、垂直线、角标框。
- 🎚️ 实时调节参数：透明度、尺寸、线宽、颜色、辉光、背景压暗和垂直偏移。
- 🪟 双窗口架构：主窗口负责设置，透明 Overlay 窗口负责渲染辅助锚点。
- 💾 本地保存设置：重启后自动恢复上次使用的 Overlay 配置。
- ⌨️ 全局快捷键：默认使用 `Ctrl + Alt + V` 快速开关 Overlay。
- 🧭 托盘菜单：支持显示设置、切换 Overlay 和退出应用。

## 🧰 技术栈

- ⚙️ **Tauri 2**：桌面壳、窗口管理、托盘、快捷键与本地状态。
- ⚛️ **React 19**：设置面板与 Overlay 视图。
- 🧪 **TypeScript + Vitest**：前端类型与单元测试。
- 🦀 **Rust**：设置校验、持久化、Tauri 命令与系统集成。
- ⚡ **Vite**：前端开发与构建。

## 🚀 快速开始

### 环境要求

- Node.js 与 npm
- Rust 工具链
- Tauri 2 所需的系统依赖

### 安装依赖

```bash
npm install
```

### 启动前端开发服务器

```bash
npm run dev
```

### 启动桌面应用

```bash
npm run tauri:dev
```

## 📦 常用命令

```bash
# 前端测试
npm test -- --run

# 前端构建
npm run build

# 桌面调试构建
npm run tauri:build:debug

# 桌面发布构建
npm run tauri:build
```

Rust 侧测试可在 `src-tauri` 目录下运行：

```bash
cargo test
```

## 🕹️ 使用方式

1. 运行 `npm run tauri:dev` 打开 VomiShield 设置窗口。
2. 点击右上角开关启用或关闭 Overlay。
3. 在设置面板中选择锚点样式，并调整透明度、颜色、尺寸、线宽等参数。
4. 使用 `Ctrl + Alt + V` 在游戏中快速切换 Overlay。
5. 通过系统托盘菜单显示设置窗口、切换 Overlay 或退出应用。

推荐在 **窗口化** 或 **无边框全屏** 游戏模式下使用。独占全屏、反作弊限制、桌面合成差异等场景可能影响 Overlay 显示效果。

## 🗂️ 项目结构

```text
.
├── src/                  # React 设置界面、Overlay 渲染与前端测试
├── src-tauri/            # Tauri 配置、Rust 命令、托盘、快捷键和设置持久化
├── public/               # 静态资源
├── docs/superpowers/     # MVP 设计说明与实施计划
├── package.json          # 前端脚本与依赖
└── README.md             # 项目说明
```

## 🔐 边界与安全

- 不注入游戏或其他进程。
- 不绕过反作弊系统。
- 不读取游戏内存或私有数据。
- Overlay 仅作为桌面视觉辅助工具使用。

## 🧭 后续方向

- 🖥️ 完善多显示器与不同 DPI 场景体验。
- 🍎 补齐 macOS 平台的打包与点击穿透细节。
- 🎨 增加更多低干扰锚点样式与预设。
- 🧪 扩展端到端验证，覆盖托盘、快捷键和持久化流程。
