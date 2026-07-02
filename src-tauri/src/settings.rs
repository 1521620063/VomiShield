use std::{fs, path::Path};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AnchorStyle {
    Crosshair,
    Ring,
    FullGuide,
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
        }
    }
}

impl OverlaySettings {
    pub fn validated(mut self) -> Result<Self, String> {
        if !is_hex_color(&self.color) {
            return Err(format!("invalid hex color: {}", self.color));
        }

        self.opacity = self.opacity.clamp(0.05, 1.0);
        self.size = self.size.clamp(32, 360);
        self.thickness = self.thickness.clamp(1, 8);

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
        }
        .validated()
        .expect("settings should be valid after numeric clamping");

        assert_eq!(settings.opacity, 1.0);
        assert_eq!(settings.size, 360);
        assert_eq!(settings.thickness, 8);
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
    fn settings_round_trip_through_json() {
        let settings = OverlaySettings {
            enabled: false,
            style: AnchorStyle::Ring,
            opacity: 0.4,
            size: 180,
            thickness: 4,
            color: "#ffcc66".to_string(),
        };

        let json = serde_json::to_string(&settings).expect("serialize settings");
        let decoded: OverlaySettings = serde_json::from_str(&json).expect("deserialize settings");

        assert_eq!(decoded, settings);
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
