mod settings;

use std::{
    path::PathBuf,
    str::FromStr,
    sync::{Arc, Mutex},
};

use settings::{load_from_path, save_to_path, Language, OverlaySettings};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    utils::config::Color,
    Emitter, Manager, State, WindowEvent, Wry,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const SETTINGS_CHANGED_EVENT: &str = "settings-changed";
const APP_ICON_BYTES: &[u8] = include_bytes!("../icons/icon.png");

struct AppState {
    settings: Arc<Mutex<OverlaySettings>>,
    settings_path: PathBuf,
    tray_menu_items: TrayMenuItems,
}

struct TrayMenuItems {
    show_settings: MenuItem<Wry>,
    toggle_overlay: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

struct TrayLabels {
    show_settings: &'static str,
    toggle_overlay: &'static str,
    quit: &'static str,
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> Result<OverlaySettings, String> {
    state
        .settings
        .lock()
        .map(|settings| settings.clone())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn update_settings(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    settings: OverlaySettings,
) -> Result<OverlaySettings, String> {
    let settings = settings.validated()?;
    persist_and_apply(&app, &state, settings)
}

#[tauri::command]
fn toggle_overlay(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<OverlaySettings, String> {
    let mut settings = state
        .settings
        .lock()
        .map(|settings| settings.clone())
        .map_err(|error| error.to_string())?;

    settings.enabled = !settings.enabled;
    persist_and_apply(&app, &state, settings)
}

fn persist_and_apply(
    app: &tauri::AppHandle,
    state: &State<'_, AppState>,
    settings: OverlaySettings,
) -> Result<OverlaySettings, String> {
    let previous = state
        .settings
        .lock()
        .map(|settings| settings.clone())
        .map_err(|error| error.to_string())?;

    apply_global_shortcut(app, &previous.shortcut, &settings.shortcut)?;

    if let Err(error) = save_to_path(&state.settings_path, &settings) {
        let _ = apply_global_shortcut(app, &settings.shortcut, &previous.shortcut);
        return Err(error);
    }

    {
        let mut current = state.settings.lock().map_err(|error| error.to_string())?;
        *current = settings.clone();
    }

    apply_overlay_visibility(app, settings.enabled);
    apply_tray_language(app, settings.language);
    app.emit(SETTINGS_CHANGED_EVENT, &settings)
        .map_err(|error| error.to_string())?;

    Ok(settings)
}

fn apply_overlay_visibility(app: &tauri::AppHandle, enabled: bool) {
    if let Some(window) = app.get_webview_window("overlay") {
        let _ = if enabled {
            window.show()
        } else {
            window.hide()
        };
    }
}

fn configure_overlay_window(app: &tauri::AppHandle, enabled: bool) {
    if let Some(window) = app.get_webview_window("overlay") {
        if let Ok(Some(monitor)) = app.primary_monitor() {
            let _ = window.set_position(monitor.position().to_owned());
            let _ = window.set_size(monitor.size().to_owned());
        }

        let _ = window.set_always_on_top(true);
        let _ = window.set_skip_taskbar(true);
        let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
        if let Some(shadow_enabled) = overlay_shadow_override_for_current_platform() {
            let _ = window.set_shadow(shadow_enabled);
        }
        let _ = window.set_ignore_cursor_events(true);
        apply_overlay_visibility(app, enabled);
    }
}

fn overlay_shadow_override_for_current_platform() -> Option<bool> {
    overlay_shadow_override_for_target_os(std::env::consts::OS)
}

fn overlay_shadow_override_for_target_os(target_os: &str) -> Option<bool> {
    match target_os {
        "macos" | "windows" => Some(false),
        _ => None,
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn configure_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let window_to_hide = window.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window_to_hide.hide();
            }
        });
    }
}

fn create_tray(
    app: &tauri::App,
    language: Language,
    icon: Option<&Image<'_>>,
) -> tauri::Result<TrayMenuItems> {
    let labels = tray_labels(language);
    let show = MenuItem::with_id(
        app,
        "show-settings",
        labels.show_settings,
        true,
        None::<&str>,
    )?;
    let toggle = MenuItem::with_id(
        app,
        "toggle-overlay",
        labels.toggle_overlay,
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", labels.quit, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &toggle, &quit])?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("VomiShield")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show-settings" => show_main_window(app),
            "toggle-overlay" => {
                if let Some(state) = app.try_state::<AppState>() {
                    let _ = toggle_overlay(app.clone(), state);
                }
            }
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = icon.or_else(|| app.default_window_icon()) {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;
    Ok(TrayMenuItems {
        show_settings: show,
        toggle_overlay: toggle,
        quit,
    })
}

fn apply_tray_language(app: &tauri::AppHandle, language: Language) {
    if let Some(state) = app.try_state::<AppState>() {
        let labels = tray_labels(language);

        let _ = state
            .tray_menu_items
            .show_settings
            .set_text(labels.show_settings);
        let _ = state
            .tray_menu_items
            .toggle_overlay
            .set_text(labels.toggle_overlay);
        let _ = state.tray_menu_items.quit.set_text(labels.quit);
    }
}

fn apply_app_icon(app: &mut tauri::App) -> tauri::Result<Image<'static>> {
    let icon = Image::from_bytes(APP_ICON_BYTES)?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_icon(icon.clone());
    }

    Ok(icon)
}

fn tray_labels(language: Language) -> TrayLabels {
    match language {
        Language::Zh => TrayLabels {
            show_settings: "显示设置",
            toggle_overlay: "开关辅助线",
            quit: "退出",
        },
        Language::En => TrayLabels {
            show_settings: "Show Settings",
            toggle_overlay: "Toggle Overlay",
            quit: "Quit",
        },
    }
}

fn install_shortcut_plugin(app: &tauri::App) -> tauri::Result<()> {
    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, incoming, event| {
                if event.state() == ShortcutState::Pressed {
                    if let Some(state) = app.try_state::<AppState>() {
                        let is_configured_shortcut = state
                            .settings
                            .lock()
                            .map(|settings| {
                                shortcut_matches_configured(incoming, &settings.shortcut)
                            })
                            .unwrap_or(false);

                        if is_configured_shortcut {
                            let _ = toggle_overlay(app.clone(), state);
                        }
                    }
                }
            })
            .build(),
    )
}

fn register_initial_shortcut(app: &tauri::AppHandle, shortcut: &str) {
    if let Err(error) = register_global_shortcut(app, shortcut) {
        log::warn!("failed to register global shortcut {shortcut}: {error}");
    }
}

fn apply_global_shortcut(app: &tauri::AppHandle, previous: &str, next: &str) -> Result<(), String> {
    if previous == next {
        return Ok(());
    }

    unregister_global_shortcut(app, previous);

    match register_global_shortcut(app, next) {
        Ok(()) => Ok(()),
        Err(error) => {
            let _ = register_global_shortcut(app, previous);
            Err(format!(
                "failed to register global shortcut {next}: {error}"
            ))
        }
    }
}

fn register_global_shortcut(app: &tauri::AppHandle, shortcut: &str) -> Result<(), String> {
    app.global_shortcut()
        .register(shortcut)
        .map_err(|error| error.to_string())
}

fn unregister_global_shortcut(app: &tauri::AppHandle, shortcut: &str) {
    if app.global_shortcut().is_registered(shortcut) {
        if let Err(error) = app.global_shortcut().unregister(shortcut) {
            log::warn!("failed to unregister global shortcut {shortcut}: {error}");
        }
    }
}

fn shortcut_from_text(shortcut: &str) -> Result<Shortcut, String> {
    Shortcut::from_str(shortcut).map_err(|error| error.to_string())
}

fn shortcut_matches_configured(incoming: &Shortcut, configured: &str) -> bool {
    shortcut_from_text(configured).is_ok_and(|shortcut| incoming == &shortcut)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_icon = apply_app_icon(app)?;
            let settings_path = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("settings.json");
            let settings = load_from_path(&settings_path);
            let tray_menu_items = create_tray(app, settings.language, Some(&app_icon))?;

            app.manage(AppState {
                settings: Arc::new(Mutex::new(settings.clone())),
                settings_path,
                tray_menu_items,
            });

            configure_overlay_window(app.handle(), settings.enabled);
            configure_main_window(app.handle());
            install_shortcut_plugin(app)?;
            register_initial_shortcut(app.handle(), &settings.shortcut);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            update_settings,
            toggle_overlay
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn overlay_shadow_override_disables_transparent_window_shadow_on_supported_platforms() {
        assert_eq!(overlay_shadow_override_for_target_os("macos"), Some(false));
        assert_eq!(overlay_shadow_override_for_target_os("windows"), Some(false));
        assert_eq!(overlay_shadow_override_for_target_os("linux"), None);
    }

    #[test]
    fn configured_shortcut_matches_registered_shortcut_aliases() {
        let incoming = shortcut_from_text("control+alt+KeyV").expect("parse incoming shortcut");

        assert!(shortcut_matches_configured(&incoming, "Ctrl+Alt+V"));
        assert!(!shortcut_matches_configured(&incoming, "Ctrl+Shift+V"));
    }
}
