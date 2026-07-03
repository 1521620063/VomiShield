use std::{fs, path::Path, str::FromStr};

use serde::{Deserialize, Serialize};
use tauri_plugin_global_shortcut::Shortcut;

pub const DEFAULT_SHORTCUT: &str = "Ctrl+Alt+V";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AnchorStyle {
    Crosshair,
    Ring,
    FullGuide,
    Horizontal,
    Vertical,
    CornerBrackets,
    BoxCircle,
    EdgeBars,
    TBars,
    DotMatrix,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Language {
    #[serde(rename = "zh")]
    Zh,
    #[serde(rename = "en")]
    En,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySettings {
    pub enabled: bool,
    pub style: AnchorStyle,
    pub opacity: f32,
    pub size: u16,
    pub thickness: u8,
    pub color: String,
    #[serde(default = "default_glow")]
    pub glow: f32,
    #[serde(default)]
    pub backdrop: f32,
    #[serde(default)]
    pub offset_y: i16,
    #[serde(default = "default_language")]
    pub language: Language,
    #[serde(default = "default_shortcut")]
    pub shortcut: String,
}

impl Default for OverlaySettings {
    fn default() -> Self {
        Self {
            enabled: true,
            style: AnchorStyle::Crosshair,
            opacity: 0.72,
            size: 120,
            thickness: 2,
            color: "#6ff0c2".to_string(),
            glow: 0.42,
            backdrop: 0.0,
            offset_y: 0,
            language: Language::Zh,
            shortcut: DEFAULT_SHORTCUT.to_string(),
        }
    }
}

impl OverlaySettings {
    pub fn validated(mut self) -> Result<Self, String> {
        if !is_hex_color(&self.color) {
            return Err(format!("invalid hex color: {}", self.color));
        }

        self.shortcut = self.shortcut.trim().to_string();
        if !is_valid_shortcut(&self.shortcut) {
            return Err(format!("invalid shortcut: {}", self.shortcut));
        }

        self.opacity = self.opacity.clamp(0.05, 1.0);
        self.size = self.size.clamp(32, 360);
        self.thickness = self.thickness.clamp(1, 8);
        self.glow = self.glow.clamp(0.0, 1.0);
        self.backdrop = self.backdrop.clamp(0.0, 0.45);
        self.offset_y = self.offset_y.clamp(-240, 240);

        Ok(self)
    }
}

pub fn load_from_path(path: &Path) -> OverlaySettings {
    fs::read_to_string(path)
        .ok()
        .and_then(|content| serde_json::from_str::<OverlaySettings>(&content).ok())
        .and_then(|settings| settings.validated().ok())
        .unwrap_or_default()
}

pub fn save_to_path(path: &Path, settings: &OverlaySettings) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let json = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

fn is_hex_color(value: &str) -> bool {
    let Some(hex) = value.strip_prefix('#') else {
        return false;
    };

    hex.len() == 6 && hex.chars().all(|char| char.is_ascii_hexdigit())
}

pub fn is_valid_shortcut(value: &str) -> bool {
    if Shortcut::from_str(value).is_err() {
        return false;
    }

    let mut has_modifier = false;
    let mut main_key_count = 0;

    for token in value.split('+').map(str::trim) {
        if is_shortcut_modifier(token) {
            has_modifier = true;
        } else {
            main_key_count += 1;
        }
    }

    has_modifier && main_key_count == 1
}

fn is_shortcut_modifier(token: &str) -> bool {
    matches!(
        token.to_ascii_uppercase().as_str(),
        "ALT"
            | "OPTION"
            | "CONTROL"
            | "CTRL"
            | "COMMAND"
            | "CMD"
            | "SUPER"
            | "SHIFT"
            | "COMMANDORCONTROL"
            | "COMMANDORCTRL"
            | "CMDORCTRL"
            | "CMDORCONTROL"
    )
}

fn default_glow() -> f32 {
    0.42
}

fn default_language() -> Language {
    Language::Zh
}

fn default_shortcut() -> String {
    DEFAULT_SHORTCUT.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_are_enabled_with_center_anchor() {
        let settings = OverlaySettings::default();

        assert!(settings.enabled);
        assert_eq!(settings.style, AnchorStyle::Crosshair);
        assert_eq!(settings.opacity, 0.72);
        assert_eq!(settings.size, 120);
        assert_eq!(settings.thickness, 2);
        assert_eq!(settings.color, "#6ff0c2");
        assert_eq!(settings.glow, 0.42);
        assert_eq!(settings.backdrop, 0.0);
        assert_eq!(settings.offset_y, 0);
        assert_eq!(settings.language, Language::Zh);
        assert_eq!(settings.shortcut, "Ctrl+Alt+V");
    }

    #[test]
    fn validation_clamps_numeric_values_to_safe_ranges() {
        let settings = OverlaySettings {
            enabled: true,
            style: AnchorStyle::FullGuide,
            opacity: 3.0,
            size: 999,
            thickness: 99,
            color: "#ffffff".to_string(),
            glow: 9.0,
            backdrop: 9.0,
            offset_y: 999,
            language: Language::Zh,
            shortcut: "Ctrl+Alt+V".to_string(),
        }
        .validated()
        .expect("settings should be valid after numeric clamping");

        assert_eq!(settings.opacity, 1.0);
        assert_eq!(settings.size, 360);
        assert_eq!(settings.thickness, 8);
        assert_eq!(settings.glow, 1.0);
        assert_eq!(settings.backdrop, 0.45);
        assert_eq!(settings.offset_y, 240);
    }

    #[test]
    fn validation_rejects_invalid_hex_colors() {
        let settings = OverlaySettings {
            color: "mint".to_string(),
            ..OverlaySettings::default()
        };

        assert!(settings.validated().is_err());
    }

    #[test]
    fn validation_rejects_shortcuts_without_modifier_or_key() {
        let without_modifier = OverlaySettings {
            shortcut: "KeyV".to_string(),
            ..OverlaySettings::default()
        };
        let only_modifier = OverlaySettings {
            shortcut: "Ctrl".to_string(),
            ..OverlaySettings::default()
        };

        assert!(without_modifier.validated().is_err());
        assert!(only_modifier.validated().is_err());
    }

    #[test]
    fn settings_round_trip_through_json() {
        let settings = OverlaySettings {
            enabled: false,
            style: AnchorStyle::Ring,
            opacity: 0.4,
            size: 180,
            thickness: 4,
            color: "#ffcc66".to_string(),
            glow: 0.6,
            backdrop: 0.2,
            offset_y: -80,
            language: Language::En,
            shortcut: "Ctrl+Shift+B".to_string(),
        };

        let json = serde_json::to_string(&settings).expect("serialize settings");
        let decoded: OverlaySettings = serde_json::from_str(&json).expect("deserialize settings");

        assert_eq!(decoded, settings);
    }

    #[test]
    fn legacy_json_without_new_visual_fields_uses_new_defaults() {
        let json = r##"{
            "enabled": true,
            "style": "crosshair",
            "opacity": 0.5,
            "size": 160,
            "thickness": 3,
            "color": "#ffffff"
        }"##;

        let decoded: OverlaySettings = serde_json::from_str(json).expect("deserialize settings");

        assert_eq!(decoded.glow, 0.42);
        assert_eq!(decoded.backdrop, 0.0);
        assert_eq!(decoded.offset_y, 0);
        assert_eq!(decoded.language, Language::Zh);
        assert_eq!(decoded.shortcut, "Ctrl+Alt+V");
    }

    #[test]
    fn invalid_file_content_falls_back_to_defaults() {
        let path = std::env::temp_dir().join("vomishield-invalid-settings.json");
        std::fs::write(&path, "{not json").expect("write invalid config");

        let settings = load_from_path(&path);

        assert_eq!(settings, OverlaySettings::default());
        let _ = std::fs::remove_file(path);
    }
}
