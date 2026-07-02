# VomiShield 🛡️

[中文](README.md) | [English](README.en.md)

VomiShield is a desktop visual-anchor overlay built with **Tauri + React + TypeScript**. It displays a lightweight, configurable overlay above windowed or borderless 3D games, giving players a stable visual reference that may help reduce motion-discomfort triggers.

> Note: VomiShield does not inject into games, hook graphics APIs, read process memory, or make medical claims. It is an external desktop overlay utility.

## ✨ Highlights

- 🎯 Multiple anchor styles: crosshair, center ring, full guide, horizontal line, vertical line, and corner brackets.
- 🎚️ Real-time controls: opacity, size, thickness, color, glow, background dimming, and vertical offset.
- 🪟 Two-window architecture: the main window manages settings, while a transparent overlay window renders the visual anchor.
- 💾 Local settings persistence: your overlay configuration is restored on the next launch.
- ⌨️ Global shortcut: toggle the overlay quickly with `Ctrl + Alt + V`.
- 🧭 System tray menu: show settings, toggle the overlay, or quit the app.

## 🧰 Tech Stack

- ⚙️ **Tauri 2**: desktop shell, window management, tray menu, shortcut registration, and local state.
- ⚛️ **React 19**: settings panel and overlay view.
- 🧪 **TypeScript + Vitest**: frontend types and unit tests.
- 🦀 **Rust**: settings validation, persistence, Tauri commands, and system integration.
- ⚡ **Vite**: frontend development and build tooling.

## 🚀 Getting Started

### Requirements

- Node.js and npm
- Rust toolchain
- System dependencies required by Tauri 2

### Install Dependencies

```bash
npm install
```

### Start the Frontend Dev Server

```bash
npm run dev
```

### Start the Desktop App

```bash
npm run tauri:dev
```

## 📦 Useful Commands

```bash
# Frontend tests
npm test -- --run

# Frontend build
npm run build

# Desktop debug build
npm run tauri:build:debug

# Desktop release build
npm run tauri:build
```

Run Rust tests from the `src-tauri` directory:

```bash
cargo test
```

## 🕹️ Usage

1. Run `npm run tauri:dev` to open the VomiShield settings window.
2. Use the top-right power button to enable or disable the overlay.
3. Choose an anchor style and adjust opacity, color, size, thickness, and other visual parameters.
4. Press `Ctrl + Alt + V` to quickly toggle the overlay while playing.
5. Use the system tray menu to show settings, toggle the overlay, or quit the app.

VomiShield is recommended for **windowed** or **borderless fullscreen** game modes. Exclusive fullscreen, anti-cheat restrictions, and platform-specific desktop composition behavior may affect overlay visibility.

## 🗂️ Project Structure

```text
.
├── src/                  # React settings UI, overlay rendering, and frontend tests
├── src-tauri/            # Tauri config, Rust commands, tray, shortcut, and settings persistence
├── public/               # Static assets
├── docs/superpowers/     # MVP design notes and implementation plan
├── package.json          # Frontend scripts and dependencies
└── README.md             # Chinese project README
```

## 🔐 Boundaries and Safety

- Does not inject into games or other processes.
- Does not bypass anti-cheat systems.
- Does not read game memory or private data.
- The overlay is only a desktop visual-assist tool.

## 🧭 Roadmap

- 🖥️ Improve multi-monitor and mixed-DPI behavior.
- 🍎 Polish macOS packaging and click-through behavior.
- 🎨 Add more low-distraction anchor styles and presets.
- 🧪 Expand end-to-end verification for tray actions, shortcuts, and persistence flows.
