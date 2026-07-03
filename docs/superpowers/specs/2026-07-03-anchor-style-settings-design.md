# Anchor Style Settings Design

## Summary

Anchor visual settings should be remembered per anchor style. Shared app controls stay at the top level, while visual controls such as opacity, color, backdrop dimming, size, thickness, and glow become style-specific.

## Goals

- Switching from one anchor style to another restores that style's last saved visual settings.
- Each anchor style can define its own size range and size step.
- Common visual controls remain available for every style: opacity, color, backdrop dimming, size, thickness, and glow.
- Existing saved settings continue to load through a migration path.

## Data Model

`OverlaySettings` keeps shared settings:

- `enabled`
- `style`
- `language`
- `shortcut`
- `offsetY`
- `styleSettings`

`styleSettings` is a record keyed by `AnchorStyle`. Each entry stores:

- `opacity`
- `color`
- `backdrop`
- `size`
- `thickness`
- `glow`

Each anchor style also has metadata for UI controls:

- default visual settings
- size minimum
- size maximum
- size step

The active visual settings are resolved from `settings.styleSettings[settings.style]`.

## UI Behavior

The style selector continues to choose the active anchor style. The controls for opacity, color, backdrop dimming, size, thickness, and glow edit only the currently selected style's entry in `styleSettings`.

When the user switches styles, the preview and overlay use that style's saved settings immediately. If a style has no saved settings, it falls back to that style's defaults.

The size slider reads its minimum, maximum, and step from the selected style's metadata. This lets compact styles use smaller, finer-grained ranges, while full-screen guide styles can use broader ranges.

## Compatibility

Older settings may still contain top-level `opacity`, `size`, `thickness`, `color`, `glow`, and `backdrop`. Loading code should normalize settings by:

1. Creating default `styleSettings` for every known anchor style.
2. Copying the old top-level visual values into the currently selected style.
3. Leaving other styles at their defaults.

Runtime helpers should tolerate partially missing `styleSettings` entries so future style additions do not break old saved data.

## Testing

Tests should cover:

- Default settings include per-style visual settings for every anchor style.
- CSS variables resolve from the active style's visual settings.
- Patching a visual setting updates only the active style.
- Size control metadata changes by selected style.
- Legacy top-level visual settings normalize into the current style.
