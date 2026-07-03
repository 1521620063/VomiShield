# Anchor Style Settings Design

## Summary

Anchor visual settings should be remembered per anchor style and, for compound anchors, per anchor part. Shared app controls stay at the top level, whole-style effects stay on the selected style, and visual controls such as opacity, color, size, thickness, and glow can be edited independently for each part.

## Goals

- Switching from one anchor style to another restores that style's last saved settings.
- Compound anchor styles can expose multiple editable parts, such as a center crosshair and outer blocks.
- Switching between parts restores that part's last saved visual settings.
- Each anchor style and part can define its own size range and size step.
- Common visual controls remain available for every editable part: opacity, color, size, thickness, and glow.
- Backdrop dimming remains available for every style as a whole-overlay effect.
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

- `backdrop`
- `activePart`
- `parts`

`parts` is a record keyed by the part ids supported by that anchor style. Simple styles have one `main` part. Compound styles can have multiple parts, for example:

- `center`
- `outer`
- `edge`

Each part stores:

- `opacity`
- `color`
- `size`
- `thickness`
- `glow`

Each anchor style has metadata for UI controls:

- default backdrop dimming
- supported parts
- default active part

Each part has metadata for UI controls:

- default visual settings
- size minimum
- size maximum
- size step

The active visual settings are resolved from `settings.styleSettings[settings.style].parts[activePart]`.

## UI Behavior

The style selector continues to choose the active anchor style. If the selected style has more than one editable part, the UI shows a part selector. The controls for opacity, color, size, thickness, and glow edit only the current part. The backdrop dimming control edits the current style.

When the user switches styles, the preview and overlay use that style's saved backdrop and part settings immediately. If a style or part has no saved settings, it falls back to the metadata defaults.

When the user switches parts within a compound style, the preview and overlay update the selected part controls to that part's saved settings. The size slider reads its minimum, maximum, and step from the selected part's metadata. This lets compact center marks use smaller, finer-grained ranges, while outer or full-screen guide parts can use broader ranges.

CSS variables should distinguish parts so compound renderers can style them independently. A simple style can use the `main` part variables, while compound styles can read variables such as center and outer color, opacity, size, thickness, and glow.

## Compatibility

Older settings may still contain top-level `opacity`, `size`, `thickness`, `color`, `glow`, and `backdrop`. Loading code should normalize settings by:

1. Creating default `styleSettings` for every known anchor style.
2. Copying the old top-level visual values into every part of the currently selected style, so the old appearance remains coherent.
3. Copying the old top-level `backdrop` into the currently selected style.
4. Leaving other styles and parts at their defaults.

Runtime helpers should tolerate partially missing `styleSettings`, `parts`, and part entries so future style or part additions do not break old saved data.

## Testing

Tests should cover:

- Default settings include per-style settings for every anchor style and per-part settings for every supported part.
- CSS variables resolve from the active style and its current part settings.
- Patching a part visual setting updates only the active part.
- Patching backdrop updates only the active style.
- Size control metadata changes by selected style and selected part.
- Legacy top-level visual settings normalize into every part of the current style.
