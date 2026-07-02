# VomiShield Overlay MVP Design

## Summary

VomiShield v1 is a Rust + Tauri desktop utility that shows a stable visual anchor over 3D games to help users reduce motion-sickness discomfort. The first version is an external desktop overlay only: it does not inject into games, hook graphics APIs, read process memory, or claim medical efficacy.

The app targets Windows first and keeps the architecture compatible with macOS. The expected game mode for v1 is windowed or borderless-windowed fullscreen.

## Product Behavior

- Launches a small settings window and creates a separate overlay window.
- Overlay can be enabled or disabled from the settings UI, tray menu, or a global shortcut.
- Overlay displays configurable visual anchors: center crosshair, horizontal/vertical guide lines, and center ring.
- User can adjust opacity, anchor size, line thickness, color, and selected anchor style.
- Settings persist locally as JSON and are restored on app launch.
- Overlay window is borderless, transparent, always-on-top, and click-through where the platform supports it.

## Architecture

- Tauri 2 is the desktop shell.
- Rust owns app state, settings validation, persistence, tray menu, global shortcut, and window configuration.
- React + TypeScript owns the settings UI and the overlay rendering.
- Two Tauri windows are used:
  - `main`: settings and controls.
  - `overlay`: transparent visual anchor surface.
- Frontend calls Rust commands to read/update settings and receives events when settings change.

## Constraints

- No game injection, graphics hooks, memory reading, driver behavior, or anti-cheat bypass.
- v1 support is best-effort for desktop composition overlays; exclusive fullscreen is not a compatibility target.
- Windows behavior is the first verification target. macOS packaging and platform-specific click-through polish can follow after the MVP.

## Acceptance Criteria

- `pnpm tauri dev` opens the settings window and an overlay window.
- Toggling overlay visibility updates the overlay immediately.
- Changing opacity, size, thickness, color, or style updates the overlay immediately.
- Settings survive app restart.
- Tray menu can show settings, toggle overlay, and quit.
- Global shortcut toggles overlay.
- Rust tests cover settings defaults, validation, and persistence path-independent serialization.
- Frontend tests cover settings reducer/update behavior and overlay style calculation.

