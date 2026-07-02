# VomiShield Overlay MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Rust + Tauri + React MVP with a configurable transparent motion-sickness overlay.

**Architecture:** Use Tauri 2 with two windows: `main` for settings and `overlay` for the anchor surface. Rust manages validated settings, persistence, tray, shortcuts, and window state; React renders controls and the overlay from shared TypeScript types.

**Tech Stack:** Rust 1.95, Tauri 2, TypeScript, React, Vite, Vitest, pnpm.

---

### Task 1: Scaffold the Tauri React app

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/tauri.conf.json`

- [ ] Create a React + Vite TypeScript app in the repository root.
- [ ] Add Tauri 2 CLI and APIs with pnpm.
- [ ] Initialize `src-tauri` with app name `VomiShield`, identifier `com.vomishield.app`, dev URL `http://localhost:5173`, frontend dev command `pnpm dev`, and frontend build command `pnpm build`.
- [ ] Verify `pnpm install` completes.
- [ ] Verify `pnpm build` completes.

### Task 2: Add settings domain tests and Rust implementation

**Files:**
- Create: `src-tauri/src/settings.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] Write Rust unit tests for default settings, clamping invalid numeric values, rejecting invalid colors, and JSON round trip.
- [ ] Run `cargo test` in `src-tauri` and confirm tests fail because `settings` does not exist.
- [ ] Implement `OverlaySettings`, `AnchorStyle`, validation, and JSON serialization.
- [ ] Run `cargo test` and confirm tests pass.

### Task 3: Add Tauri state, commands, tray, shortcut, and windows

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`

- [ ] Add Rust dependencies and Tauri plugins needed for global shortcut and opener behavior.
- [ ] Add commands: `get_settings`, `update_settings`, and `toggle_overlay`.
- [ ] Create and configure the `overlay` window as transparent, decorations-free, always-on-top, skip-taskbar, and hidden until enabled.
- [ ] Add a tray menu with `Show Settings`, `Toggle Overlay`, and `Quit`.
- [ ] Register a global shortcut, defaulting to `Ctrl+Alt+V` on Windows/Linux and `CmdOrCtrl+Alt+V` through Tauri shortcut syntax where supported.
- [ ] Emit a `settings-changed` event whenever settings change.
- [ ] Run `cargo test` and `cargo check`.

### Task 4: Add frontend state tests and UI implementation

**Files:**
- Create: `src/settings.ts`
- Create: `src/settings.test.ts`
- Create: `src/tauri.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] Write Vitest tests for default frontend settings, patch merging, and overlay CSS variable generation.
- [ ] Run `pnpm test -- --run` and confirm tests fail because helpers do not exist.
- [ ] Implement TypeScript settings helpers.
- [ ] Build settings UI with controls for enabled, style, opacity, size, thickness, and color.
- [ ] Connect UI to Tauri commands and listen for `settings-changed`.
- [ ] Add route/hash detection so the overlay window renders only the overlay surface.
- [ ] Run `pnpm test -- --run` and `pnpm build`.

### Task 5: Verify desktop behavior

**Files:**
- No new files expected.

- [ ] Run `pnpm tauri dev`.
- [ ] Confirm settings window opens.
- [ ] Confirm overlay window appears when enabled.
- [ ] Confirm controls update overlay without restarting.
- [ ] Confirm tray toggle works.
- [ ] Confirm global shortcut toggles overlay.
- [ ] Confirm settings persist after app restart.
- [ ] Record any platform limitation found during Windows verification.

