mod settings;

use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

use settings::{load_from_path, save_to_path, Language, OverlaySettings};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, State, Wry,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const SETTINGS_CHANGED_EVENT: &str = "settings-changed";

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
    {
        let mut current = state.settings.lock().map_err(|error| error.to_string())?;
        *current = settings.clone();
    }

    save_to_path(&state.settings_path, &settings)?;
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
        let _ = window.set_ignore_cursor_events(true);
        apply_overlay_visibility(app, enabled);
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn create_tray(app: &tauri::App, language: Language) -> tauri::Result<TrayMenuItems> {
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

    if let Some(icon) = app.default_window_icon() {
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

fn register_shortcut(app: &tauri::App) -> tauri::Result<()> {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyV);

    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |app, incoming, event| {
                if incoming == &shortcut && event.state() == ShortcutState::Pressed {
                    if let Some(state) = app.try_state::<AppState>() {
                        let _ = toggle_overlay(app.clone(), state);
                    }
                }
            })
            .build(),
    )?;

    if let Err(error) = app.global_shortcut().register(shortcut) {
        log::warn!("failed to register global shortcut Ctrl+Alt+V: {error}");
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let settings_path = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("settings.json");
            let settings = load_from_path(&settings_path);
            let tray_menu_items = create_tray(app, settings.language)?;

            app.manage(AppState {
                settings: Arc::new(Mutex::new(settings.clone())),
                settings_path,
                tray_menu_items,
            });

            configure_overlay_window(app.handle(), settings.enabled);
            register_shortcut(app)?;

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
