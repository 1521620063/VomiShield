use std::{collections::HashMap, fs, path::Path, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;
use tauri_plugin_global_shortcut::Shortcut;

pub const DEFAULT_SHORTCUT: &str = "Ctrl+Alt+V";
const DEFAULT_OPACITY: f32 = 0.72;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AnchorPart {
    Main,
    Center,
    Outer,
    Guide,
    Edge,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnchorPartSettings {
    pub opacity: f32,
    pub size: u16,
    pub thickness: u8,
    pub color: String,
    pub glow: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnchorStyleSettings {
    pub backdrop: f32,
    pub active_part: AnchorPart,
    pub parts: HashMap<AnchorPart, AnchorPartSettings>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Language {
    #[serde(rename = "zh")]
    Zh,
    #[serde(rename = "en")]
    En,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlaySettings {
    pub enabled: bool,
    pub style: AnchorStyle,
    pub style_settings: HashMap<AnchorStyle, AnchorStyleSettings>,
    #[serde(default)]
    pub offset_y: i16,
    #[serde(default = "default_language")]
    pub language: Language,
    #[serde(default = "default_shortcut")]
    pub shortcut: String,
}

impl<'de> Deserialize<'de> for OverlaySettings {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let raw = RawOverlaySettings::deserialize(deserializer)?;
        let style = raw
            .style
            .as_deref()
            .and_then(parse_anchor_style)
            .unwrap_or(AnchorStyle::Crosshair);
        let mut settings = if let Some(style_settings) = raw.style_settings {
            Self {
                enabled: raw.enabled.unwrap_or(true),
                style,
                style_settings: style_settings
                    .into_iter()
                    .filter_map(|(style, settings)| {
                        let style = parse_anchor_style(&style)?;
                        let settings = serde_json::from_value::<RawAnchorStyleSettings>(settings)
                            .unwrap_or_default();
                        Some((style, settings.into_style_settings(style)))
                    })
                    .collect(),
                offset_y: raw.offset_y.unwrap_or_default(),
                language: raw
                    .language
                    .as_deref()
                    .and_then(parse_language)
                    .unwrap_or_else(default_language),
                shortcut: raw.shortcut.unwrap_or_else(default_shortcut),
            }
        } else {
            Self {
                enabled: raw.enabled.unwrap_or(true),
                style,
                style_settings: default_style_settings(),
                offset_y: raw.offset_y.unwrap_or_default(),
                language: raw
                    .language
                    .as_deref()
                    .and_then(parse_language)
                    .unwrap_or_else(default_language),
                shortcut: raw.shortcut.unwrap_or_else(default_shortcut),
            }
        };

        settings.apply_legacy_visual_fields(
            style,
            raw.opacity,
            raw.size,
            raw.thickness,
            raw.color,
            raw.glow,
            raw.backdrop,
        );

        Ok(settings)
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawOverlaySettings {
    enabled: Option<bool>,
    style: Option<String>,
    style_settings: Option<HashMap<String, Value>>,
    offset_y: Option<i16>,
    language: Option<String>,
    shortcut: Option<String>,
    opacity: Option<f32>,
    size: Option<u16>,
    thickness: Option<u8>,
    color: Option<String>,
    glow: Option<f32>,
    backdrop: Option<f32>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawAnchorStyleSettings {
    backdrop: Option<f32>,
    active_part: Option<String>,
    parts: Option<HashMap<String, Value>>,
}

impl RawAnchorStyleSettings {
    fn into_style_settings(self, style: AnchorStyle) -> AnchorStyleSettings {
        let defaults = default_settings_for_style(style);
        let active_part = self
            .active_part
            .as_deref()
            .and_then(parse_anchor_part)
            .unwrap_or(defaults.active_part);

        AnchorStyleSettings {
            backdrop: self.backdrop.unwrap_or(defaults.backdrop),
            active_part,
            parts: self
                .parts
                .map(|parts| {
                    parts
                        .into_iter()
                        .filter_map(|(part, settings)| {
                            let part = parse_anchor_part(&part)?;
                            let settings =
                                serde_json::from_value::<RawAnchorPartSettings>(settings)
                                    .unwrap_or_default();
                            let default = defaults
                                .parts
                                .get(&part)
                                .cloned()
                                .unwrap_or_else(default_part_settings);
                            Some((part, settings.into_part_settings(default)))
                        })
                        .collect()
                })
                .unwrap_or(defaults.parts),
        }
    }
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawAnchorPartSettings {
    opacity: Option<f32>,
    size: Option<u16>,
    thickness: Option<u8>,
    color: Option<String>,
    glow: Option<f32>,
}

impl RawAnchorPartSettings {
    fn into_part_settings(self, default: AnchorPartSettings) -> AnchorPartSettings {
        AnchorPartSettings {
            opacity: self.opacity.unwrap_or(default.opacity),
            size: self.size.unwrap_or(default.size),
            thickness: self.thickness.unwrap_or(default.thickness),
            color: self.color.unwrap_or(default.color),
            glow: self.glow.unwrap_or(default.glow),
        }
    }
}

impl Default for OverlaySettings {
    fn default() -> Self {
        Self {
            enabled: true,
            style: AnchorStyle::Crosshair,
            style_settings: default_style_settings(),
            offset_y: 0,
            language: Language::Zh,
            shortcut: DEFAULT_SHORTCUT.to_string(),
        }
    }
}

impl OverlaySettings {
    pub fn validated(mut self) -> Result<Self, String> {
        self.shortcut = self.shortcut.trim().to_string();
        if !is_valid_shortcut(&self.shortcut) {
            return Err(format!("invalid shortcut: {}", self.shortcut));
        }

        for style in all_anchor_styles() {
            let defaults = default_settings_for_style(style);
            let style_settings = self
                .style_settings
                .entry(style)
                .or_insert_with(|| defaults.clone());

            style_settings.backdrop = style_settings.backdrop.clamp(0.0, 0.45);
            for part in valid_parts_for_style(style) {
                style_settings
                    .parts
                    .entry(part)
                    .or_insert_with(|| defaults.parts[&part].clone());
            }
            if !valid_parts_for_style(style).contains(&style_settings.active_part) {
                style_settings.active_part = defaults.active_part;
            }

            for part_settings in style_settings.parts.values_mut() {
                if !is_hex_color(&part_settings.color) {
                    return Err(format!("invalid hex color: {}", part_settings.color));
                }
                part_settings.opacity = part_settings.opacity.clamp(0.05, 1.0);
                part_settings.size = part_settings.size.clamp(32, 360);
                part_settings.thickness = part_settings.thickness.clamp(1, 8);
                part_settings.glow = part_settings.glow.clamp(0.0, 1.0);
            }
        }

        self.offset_y = self.offset_y.clamp(-240, 240);

        Ok(self)
    }

    fn apply_legacy_visual_fields(
        &mut self,
        style: AnchorStyle,
        opacity: Option<f32>,
        size: Option<u16>,
        thickness: Option<u8>,
        color: Option<String>,
        glow: Option<f32>,
        backdrop: Option<f32>,
    ) {
        if opacity.is_none()
            && size.is_none()
            && thickness.is_none()
            && color.is_none()
            && glow.is_none()
            && backdrop.is_none()
        {
            return;
        }

        let style_settings = self
            .style_settings
            .entry(style)
            .or_insert_with(|| default_settings_for_style(style));
        if let Some(backdrop) = backdrop {
            style_settings.backdrop = backdrop;
        }

        for part in valid_parts_for_style(style) {
            let settings = style_settings
                .parts
                .entry(part)
                .or_insert_with(default_part_settings);
            if let Some(opacity) = opacity {
                settings.opacity = opacity;
            }
            if let Some(size) = size {
                settings.size = size;
            }
            if let Some(thickness) = thickness {
                settings.thickness = thickness;
            }
            if let Some(color) = color.as_ref() {
                settings.color = color.clone();
            }
            if let Some(glow) = glow {
                settings.glow = glow;
            }
        }
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

fn all_anchor_styles() -> [AnchorStyle; 10] {
    [
        AnchorStyle::Crosshair,
        AnchorStyle::Ring,
        AnchorStyle::FullGuide,
        AnchorStyle::Horizontal,
        AnchorStyle::Vertical,
        AnchorStyle::CornerBrackets,
        AnchorStyle::BoxCircle,
        AnchorStyle::EdgeBars,
        AnchorStyle::TBars,
        AnchorStyle::DotMatrix,
    ]
}

fn valid_parts_for_style(style: AnchorStyle) -> Vec<AnchorPart> {
    match style {
        AnchorStyle::FullGuide => vec![AnchorPart::Guide, AnchorPart::Center],
        AnchorStyle::BoxCircle
        | AnchorStyle::EdgeBars
        | AnchorStyle::TBars
        | AnchorStyle::DotMatrix => vec![AnchorPart::Center, AnchorPart::Outer],
        _ => vec![AnchorPart::Main],
    }
}

fn default_style_settings() -> HashMap<AnchorStyle, AnchorStyleSettings> {
    all_anchor_styles()
        .into_iter()
        .map(|style| (style, default_settings_for_style(style)))
        .collect()
}

fn default_settings_for_style(style: AnchorStyle) -> AnchorStyleSettings {
    let mut parts = HashMap::new();
    let (active_part, part_settings) = match style {
        AnchorStyle::Crosshair => (
            AnchorPart::Main,
            vec![(AnchorPart::Main, 120, DEFAULT_OPACITY)],
        ),
        AnchorStyle::Ring => (
            AnchorPart::Main,
            vec![(AnchorPart::Main, 104, DEFAULT_OPACITY)],
        ),
        AnchorStyle::FullGuide => (
            AnchorPart::Guide,
            vec![
                (AnchorPart::Guide, 160, 0.5),
                (AnchorPart::Center, 72, DEFAULT_OPACITY),
            ],
        ),
        AnchorStyle::Horizontal | AnchorStyle::Vertical => {
            (AnchorPart::Main, vec![(AnchorPart::Main, 160, 0.62)])
        }
        AnchorStyle::CornerBrackets => (
            AnchorPart::Main,
            vec![(AnchorPart::Main, 136, DEFAULT_OPACITY)],
        ),
        AnchorStyle::BoxCircle => (
            AnchorPart::Center,
            vec![
                (AnchorPart::Center, 96, DEFAULT_OPACITY),
                (AnchorPart::Outer, 148, DEFAULT_OPACITY),
            ],
        ),
        AnchorStyle::EdgeBars => (
            AnchorPart::Center,
            vec![
                (AnchorPart::Center, 88, DEFAULT_OPACITY),
                (AnchorPart::Outer, 180, DEFAULT_OPACITY),
            ],
        ),
        AnchorStyle::TBars => (
            AnchorPart::Center,
            vec![
                (AnchorPart::Center, 84, DEFAULT_OPACITY),
                (AnchorPart::Outer, 132, DEFAULT_OPACITY),
            ],
        ),
        AnchorStyle::DotMatrix => (
            AnchorPart::Center,
            vec![
                (AnchorPart::Center, 88, DEFAULT_OPACITY),
                (AnchorPart::Outer, 148, DEFAULT_OPACITY),
            ],
        ),
    };

    for (part, size, opacity) in part_settings {
        parts.insert(
            part,
            AnchorPartSettings {
                opacity,
                size,
                ..default_part_settings()
            },
        );
    }

    AnchorStyleSettings {
        backdrop: 0.0,
        active_part,
        parts,
    }
}

fn default_part_settings() -> AnchorPartSettings {
    AnchorPartSettings {
        opacity: DEFAULT_OPACITY,
        size: 120,
        thickness: 2,
        color: "#6ff0c2".to_string(),
        glow: 0.42,
    }
}

fn parse_anchor_style(value: &str) -> Option<AnchorStyle> {
    serde_json::from_value(serde_json::Value::String(value.to_string())).ok()
}

fn parse_anchor_part(value: &str) -> Option<AnchorPart> {
    serde_json::from_value(serde_json::Value::String(value.to_string())).ok()
}

fn parse_language(value: &str) -> Option<Language> {
    serde_json::from_value(serde_json::Value::String(value.to_string())).ok()
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
    use std::collections::HashMap;

    #[test]
    fn default_settings_are_enabled_with_center_anchor() {
        let settings = OverlaySettings::default();

        assert!(settings.enabled);
        assert_eq!(settings.style, AnchorStyle::Crosshair);
        assert_eq!(settings.style_settings.len(), 10);
        let crosshair = settings
            .style_settings
            .get(&AnchorStyle::Crosshair)
            .expect("crosshair style settings");
        let crosshair_main = crosshair
            .parts
            .get(&AnchorPart::Main)
            .expect("crosshair main part");
        assert_eq!(crosshair.backdrop, 0.0);
        assert_eq!(crosshair.active_part, AnchorPart::Main);
        assert_eq!(crosshair_main.opacity, 0.72);
        assert_eq!(crosshair_main.size, 120);
        assert_eq!(crosshair_main.thickness, 2);
        assert_eq!(crosshair_main.color, "#6ff0c2");
        assert_eq!(crosshair_main.glow, 0.42);
        let box_circle = settings
            .style_settings
            .get(&AnchorStyle::BoxCircle)
            .expect("boxCircle style settings");
        assert_eq!(box_circle.active_part, AnchorPart::Center);
        assert_eq!(box_circle.parts[&AnchorPart::Center].size, 96);
        assert_eq!(box_circle.parts[&AnchorPart::Outer].size, 148);
        assert_eq!(settings.offset_y, 0);
        assert_eq!(settings.language, Language::Zh);
        assert_eq!(settings.shortcut, "Ctrl+Alt+V");
    }

    #[test]
    fn validation_clamps_nested_part_settings() {
        let mut settings = OverlaySettings::default();
        let box_circle = settings
            .style_settings
            .get_mut(&AnchorStyle::BoxCircle)
            .expect("boxCircle settings");
        box_circle.backdrop = 9.0;
        let outer = box_circle
            .parts
            .get_mut(&AnchorPart::Outer)
            .expect("outer settings");
        outer.opacity = 3.0;
        outer.size = 999;
        outer.thickness = 99;
        outer.glow = 9.0;
        settings.offset_y = 999;

        let settings = settings
            .validated()
            .expect("settings should be valid after numeric clamping");
        let box_circle = &settings.style_settings[&AnchorStyle::BoxCircle];
        let outer = &box_circle.parts[&AnchorPart::Outer];

        assert_eq!(box_circle.backdrop, 0.45);
        assert_eq!(outer.opacity, 1.0);
        assert_eq!(outer.size, 360);
        assert_eq!(outer.thickness, 8);
        assert_eq!(outer.glow, 1.0);
        assert_eq!(settings.offset_y, 240);
    }

    #[test]
    fn validation_rejects_invalid_hex_colors() {
        let mut settings = OverlaySettings::default();
        settings
            .style_settings
            .get_mut(&AnchorStyle::Crosshair)
            .expect("crosshair settings")
            .parts
            .get_mut(&AnchorPart::Main)
            .expect("main settings")
            .color = "mint".to_string();

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
        let mut ring_parts = HashMap::new();
        ring_parts.insert(
            AnchorPart::Main,
            AnchorPartSettings {
                opacity: 0.4,
                size: 180,
                thickness: 4,
                color: "#ffcc66".to_string(),
                glow: 0.6,
            },
        );
        let mut style_settings = HashMap::new();
        style_settings.insert(
            AnchorStyle::Ring,
            AnchorStyleSettings {
                backdrop: 0.2,
                active_part: AnchorPart::Main,
                parts: ring_parts,
            },
        );
        let settings = OverlaySettings {
            enabled: false,
            style: AnchorStyle::Ring,
            style_settings,
            offset_y: -80,
            language: Language::En,
            shortcut: "Ctrl+Shift+B".to_string(),
        };

        let json = serde_json::to_string(&settings).expect("serialize settings");
        let decoded: OverlaySettings = serde_json::from_str(&json).expect("deserialize settings");

        assert_eq!(decoded, settings);
    }

    #[test]
    fn legacy_json_migrates_visual_fields_into_current_style_parts() {
        let json = r##"{
            "enabled": true,
            "style": "boxCircle",
            "opacity": 0.5,
            "size": 123,
            "thickness": 4,
            "color": "#ffffff",
            "glow": 0.8,
            "backdrop": 0.3,
            "offsetY": 16,
            "language": "en",
            "shortcut": "Ctrl+Alt+B"
        }"##;

        let decoded: OverlaySettings = serde_json::from_str(json).expect("deserialize settings");
        let box_circle = decoded
            .style_settings
            .get(&AnchorStyle::BoxCircle)
            .expect("boxCircle settings");

        assert_eq!(box_circle.backdrop, 0.3);
        for part in [AnchorPart::Center, AnchorPart::Outer] {
            let settings = &box_circle.parts[&part];
            assert_eq!(settings.opacity, 0.5);
            assert_eq!(settings.size, 123);
            assert_eq!(settings.thickness, 4);
            assert_eq!(settings.color, "#ffffff");
            assert_eq!(settings.glow, 0.8);
        }
        assert_eq!(
            decoded.style_settings[&AnchorStyle::Crosshair].parts[&AnchorPart::Main].size,
            120
        );
        assert_eq!(decoded.offset_y, 16);
        assert_eq!(decoded.language, Language::En);
        assert_eq!(decoded.shortcut, "Ctrl+Alt+B");
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
        let crosshair = decoded
            .style_settings
            .get(&AnchorStyle::Crosshair)
            .expect("crosshair settings");
        let main = &crosshair.parts[&AnchorPart::Main];

        assert_eq!(main.glow, 0.42);
        assert_eq!(crosshair.backdrop, 0.0);
        assert_eq!(decoded.offset_y, 0);
        assert_eq!(decoded.language, Language::Zh);
        assert_eq!(decoded.shortcut, "Ctrl+Alt+V");
    }

    #[test]
    fn invalid_active_part_in_nested_json_falls_back_to_style_default() {
        let json = r##"{
            "enabled": true,
            "style": "crosshair",
            "styleSettings": {
                "boxCircle": {
                    "backdrop": 0.1,
                    "activePart": "guide",
                    "parts": {
                        "center": {
                            "opacity": 0.72,
                            "size": 96,
                            "thickness": 2,
                            "color": "#6ff0c2",
                            "glow": 0.42
                        },
                        "outer": {
                            "opacity": 0.72,
                            "size": 148,
                            "thickness": 2,
                            "color": "#6ff0c2",
                            "glow": 0.42
                        }
                    }
                }
            },
            "shortcut": "Ctrl+Alt+V"
        }"##;

        let decoded: OverlaySettings = serde_json::from_str::<OverlaySettings>(json)
            .expect("deserialize settings")
            .validated()
            .expect("validated settings");

        assert_eq!(
            decoded.style_settings[&AnchorStyle::BoxCircle].active_part,
            AnchorPart::Center
        );
    }

    #[test]
    fn nested_json_ignores_unknown_style_settings_keys() {
        let json = r##"{
            "enabled": true,
            "style": "boxCircle",
            "styleSettings": {
                "futureStyle": {
                    "backdrop": 0.4,
                    "activePart": "main",
                    "parts": {
                        "main": {
                            "opacity": 0.1,
                            "size": 40,
                            "thickness": 1,
                            "color": "#ffffff",
                            "glow": 0.1
                        }
                    }
                },
                "boxCircle": {
                    "backdrop": 0.2,
                    "activePart": "outer",
                    "parts": {
                        "center": {
                            "opacity": 0.6,
                            "size": 99,
                            "thickness": 3,
                            "color": "#abcdef",
                            "glow": 0.2
                        },
                        "outer": {
                            "opacity": 0.7,
                            "size": 155,
                            "thickness": 4,
                            "color": "#123456",
                            "glow": 0.3
                        }
                    }
                }
            }
        }"##;

        let decoded: OverlaySettings =
            serde_json::from_str(json).expect("unknown style keys should not fail deserialization");
        let box_circle = &decoded.style_settings[&AnchorStyle::BoxCircle];

        assert_eq!(box_circle.backdrop, 0.2);
        assert_eq!(box_circle.active_part, AnchorPart::Outer);
        assert_eq!(box_circle.parts[&AnchorPart::Center].color, "#abcdef");
        assert_eq!(box_circle.parts[&AnchorPart::Outer].size, 155);
        assert!(!decoded.style_settings.contains_key(&AnchorStyle::Crosshair));
    }

    #[test]
    fn nested_json_ignores_unknown_part_keys() {
        let json = r##"{
            "enabled": true,
            "style": "boxCircle",
            "styleSettings": {
                "boxCircle": {
                    "backdrop": 0.2,
                    "activePart": "center",
                    "parts": {
                        "futurePart": {
                            "opacity": 0.1,
                            "size": 40,
                            "thickness": 1,
                            "color": "#ffffff",
                            "glow": 0.1
                        },
                        "center": {
                            "opacity": 0.6,
                            "size": 99,
                            "thickness": 3,
                            "color": "#abcdef",
                            "glow": 0.2
                        },
                        "outer": {
                            "opacity": 0.7,
                            "size": 155,
                            "thickness": 4,
                            "color": "#123456",
                            "glow": 0.3
                        }
                    }
                }
            }
        }"##;

        let decoded: OverlaySettings =
            serde_json::from_str(json).expect("unknown part keys should not fail deserialization");
        let box_circle = &decoded.style_settings[&AnchorStyle::BoxCircle];

        assert_eq!(box_circle.parts.len(), 2);
        assert_eq!(box_circle.parts[&AnchorPart::Center].size, 99);
        assert_eq!(box_circle.parts[&AnchorPart::Outer].color, "#123456");
    }

    #[test]
    fn invalid_top_level_style_falls_back_without_discarding_settings() {
        let json = r##"{
            "enabled": true,
            "style": "futureStyle",
            "language": "en",
            "shortcut": "Ctrl+Alt+B",
            "styleSettings": {
                "boxCircle": {
                    "backdrop": 0.2,
                    "activePart": "center",
                    "parts": {
                        "center": {
                            "opacity": 0.6,
                            "size": 99,
                            "thickness": 3,
                            "color": "#abcdef",
                            "glow": 0.2
                        },
                        "outer": {
                            "opacity": 0.7,
                            "size": 155,
                            "thickness": 4,
                            "color": "#123456",
                            "glow": 0.3
                        }
                    }
                }
            }
        }"##;

        let decoded: OverlaySettings = serde_json::from_str(json)
            .expect("unknown top-level style should not fail deserialization");

        assert_eq!(decoded.style, AnchorStyle::Crosshair);
        assert_eq!(decoded.language, Language::En);
        assert_eq!(decoded.shortcut, "Ctrl+Alt+B");
        assert_eq!(
            decoded.style_settings[&AnchorStyle::BoxCircle].parts[&AnchorPart::Center].size,
            99
        );
    }

    #[test]
    fn malformed_unknown_style_settings_entry_is_ignored() {
        let json = r##"{
            "enabled": true,
            "style": "boxCircle",
            "styleSettings": {
                "futureStyle": null,
                "boxCircle": {
                    "backdrop": 0.2,
                    "activePart": "center",
                    "parts": {
                        "center": {
                            "opacity": 0.6,
                            "size": 99,
                            "thickness": 3,
                            "color": "#abcdef",
                            "glow": 0.2
                        },
                        "outer": {
                            "opacity": 0.7,
                            "size": 155,
                            "thickness": 4,
                            "color": "#123456",
                            "glow": 0.3
                        }
                    }
                }
            }
        }"##;

        let decoded: OverlaySettings = serde_json::from_str(json)
            .expect("malformed unknown style entry should not fail deserialization");
        let box_circle = &decoded.style_settings[&AnchorStyle::BoxCircle];

        assert_eq!(box_circle.backdrop, 0.2);
        assert_eq!(box_circle.parts[&AnchorPart::Center].size, 99);
        assert_eq!(box_circle.parts[&AnchorPart::Outer].color, "#123456");
    }

    #[test]
    fn malformed_unknown_part_entry_is_ignored() {
        let json = r##"{
            "enabled": true,
            "style": "boxCircle",
            "styleSettings": {
                "boxCircle": {
                    "backdrop": 0.2,
                    "activePart": "center",
                    "parts": {
                        "futurePart": null,
                        "center": {
                            "opacity": 0.6,
                            "size": 99,
                            "thickness": 3,
                            "color": "#abcdef",
                            "glow": 0.2
                        },
                        "outer": {
                            "opacity": 0.7,
                            "size": 155,
                            "thickness": 4,
                            "color": "#123456",
                            "glow": 0.3
                        }
                    }
                }
            }
        }"##;

        let decoded: OverlaySettings = serde_json::from_str(json)
            .expect("malformed unknown part entry should not fail deserialization");
        let box_circle = &decoded.style_settings[&AnchorStyle::BoxCircle];

        assert_eq!(box_circle.parts.len(), 2);
        assert_eq!(box_circle.parts[&AnchorPart::Center].color, "#abcdef");
        assert_eq!(box_circle.parts[&AnchorPart::Outer].size, 155);
    }

    #[test]
    fn invalid_language_falls_back_without_discarding_settings() {
        let json = r##"{
            "enabled": true,
            "style": "boxCircle",
            "language": "future",
            "shortcut": "Ctrl+Alt+B",
            "styleSettings": {
                "boxCircle": {
                    "backdrop": 0.2,
                    "activePart": "center",
                    "parts": {
                        "center": {
                            "opacity": 0.6,
                            "size": 99,
                            "thickness": 3,
                            "color": "#abcdef",
                            "glow": 0.2
                        },
                        "outer": {
                            "opacity": 0.7,
                            "size": 155,
                            "thickness": 4,
                            "color": "#123456",
                            "glow": 0.3
                        }
                    }
                }
            }
        }"##;

        let decoded: OverlaySettings =
            serde_json::from_str(json).expect("unknown language should not fail deserialization");

        assert_eq!(decoded.style, AnchorStyle::BoxCircle);
        assert_eq!(decoded.language, Language::Zh);
        assert_eq!(decoded.shortcut, "Ctrl+Alt+B");
        assert_eq!(
            decoded.style_settings[&AnchorStyle::BoxCircle].parts[&AnchorPart::Center].size,
            99
        );
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
