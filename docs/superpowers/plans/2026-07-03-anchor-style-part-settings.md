# Anchor Style Part Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store visual settings independently per anchor style and per anchor part, with per-part size metadata and legacy settings migration.

**Architecture:** The TypeScript settings module becomes the source of truth for frontend defaults, active style/part helpers, patch helpers, and CSS variable generation. The Rust settings module mirrors the serialized shape, validates nested style/part settings, and migrates old top-level visual fields into the current style. The React UI edits either the active part or active style backdrop, and CSS consumes part-specific variables for compound renderers.

**Tech Stack:** React 19, TypeScript 6, Vitest, Tauri 2, Rust, Serde, Cargo tests.

---

### Task 1: TypeScript Settings Model

**Files:**
- Modify: `src/settings.ts`
- Test: `src/settings.test.ts`

- [ ] **Step 1: Write failing tests for nested defaults, active helpers, patches, metadata, and legacy normalization**

Add these imports in `src/settings.test.ts`:

```ts
import {
  ANCHOR_STYLE_CONFIGS,
  activeAnchorPartSettings,
  activeAnchorStyleSettings,
  activePartConfig,
  normalizeOverlaySettings,
  patchActivePartSettings,
  patchActiveStyleSettings,
} from './settings'
```

Replace the old default/CSS/patch tests with tests that assert this shape:

```ts
it('keeps the frontend defaults aligned with the nested Rust defaults', () => {
  expect(DEFAULT_SETTINGS.enabled).toBe(true)
  expect(DEFAULT_SETTINGS.style).toBe('crosshair')
  expect(DEFAULT_SETTINGS.offsetY).toBe(0)
  expect(DEFAULT_SETTINGS.language).toBe('zh')
  expect(DEFAULT_SETTINGS.shortcut).toBe('Ctrl+Alt+V')
  expect(Object.keys(DEFAULT_SETTINGS.styleSettings)).toEqual(Object.keys(ANCHOR_STYLE_CONFIGS))
  expect(DEFAULT_SETTINGS.styleSettings.crosshair.parts.main).toEqual({
    opacity: 0.72,
    size: 120,
    thickness: 2,
    color: '#6ff0c2',
    glow: 0.42,
  })
  expect(DEFAULT_SETTINGS.styleSettings.boxCircle.activePart).toBe('center')
  expect(DEFAULT_SETTINGS.styleSettings.boxCircle.parts.outer).toBeDefined()
})

it('patches active part settings without changing sibling parts', () => {
  const current = normalizeOverlaySettings({
    ...DEFAULT_SETTINGS,
    style: 'boxCircle',
    styleSettings: {
      ...DEFAULT_SETTINGS.styleSettings,
      boxCircle: {
        ...DEFAULT_SETTINGS.styleSettings.boxCircle,
        activePart: 'outer',
      },
    },
  })

  const next = patchActivePartSettings(current, { color: '#ffffff', size: 180 })

  expect(next.styleSettings.boxCircle.parts.outer.color).toBe('#ffffff')
  expect(next.styleSettings.boxCircle.parts.outer.size).toBe(180)
  expect(next.styleSettings.boxCircle.parts.center).toEqual(
    current.styleSettings.boxCircle.parts.center,
  )
})

it('patches active style backdrop without changing part visuals', () => {
  const next = patchActiveStyleSettings(DEFAULT_SETTINGS, { backdrop: 0.2 })

  expect(next.styleSettings.crosshair.backdrop).toBe(0.2)
  expect(next.styleSettings.crosshair.parts.main).toEqual(
    DEFAULT_SETTINGS.styleSettings.crosshair.parts.main,
  )
})

it('creates CSS variables for main and compound anchor parts', () => {
  const settings = normalizeOverlaySettings({
    ...DEFAULT_SETTINGS,
    style: 'boxCircle',
    styleSettings: {
      ...DEFAULT_SETTINGS.styleSettings,
      boxCircle: {
        ...DEFAULT_SETTINGS.styleSettings.boxCircle,
        backdrop: 0.18,
        parts: {
          ...DEFAULT_SETTINGS.styleSettings.boxCircle.parts,
          center: {
            opacity: 0.5,
            size: 80,
            thickness: 4,
            color: '#ffffff',
            glow: 0.2,
          },
          outer: {
            opacity: 0.9,
            size: 160,
            thickness: 3,
            color: '#ffcc66',
            glow: 0.7,
          },
        },
      },
    },
  })

  expect(overlayCssVars(settings)).toMatchObject({
    '--backdrop-opacity': '0.18',
    '--anchor-opacity': '0.5',
    '--anchor-size': '80px',
    '--anchor-color': '#ffffff',
    '--anchor-center-opacity': '0.5',
    '--anchor-center-size': '80px',
    '--anchor-center-color': '#ffffff',
    '--anchor-outer-opacity': '0.9',
    '--anchor-outer-size': '160px',
    '--anchor-outer-color': '#ffcc66',
  })
})

it('normalizes legacy top-level visual settings into every part of the current style', () => {
  const legacy = normalizeOverlaySettings({
    enabled: true,
    style: 'boxCircle',
    opacity: 0.33,
    size: 144,
    thickness: 5,
    color: '#ffffff',
    glow: 0.25,
    backdrop: 0.12,
    offsetY: 0,
    language: 'zh',
    shortcut: 'Ctrl+Alt+V',
  })

  expect(legacy.styleSettings.boxCircle.backdrop).toBe(0.12)
  expect(legacy.styleSettings.boxCircle.parts.center).toMatchObject({
    opacity: 0.33,
    size: 144,
    thickness: 5,
    color: '#ffffff',
    glow: 0.25,
  })
  expect(legacy.styleSettings.boxCircle.parts.outer).toMatchObject({
    opacity: 0.33,
    size: 144,
    thickness: 5,
    color: '#ffffff',
    glow: 0.25,
  })
})

it('returns selected part size metadata', () => {
  const settings = normalizeOverlaySettings({
    ...DEFAULT_SETTINGS,
    style: 'boxCircle',
    styleSettings: {
      ...DEFAULT_SETTINGS.styleSettings,
      boxCircle: {
        ...DEFAULT_SETTINGS.styleSettings.boxCircle,
        activePart: 'outer',
      },
    },
  })

  expect(activePartConfig(settings).size).toEqual({ min: 48, max: 360, step: 4 })
})
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- src/settings.test.ts --run`

Expected: TypeScript compile errors for the new helpers and nested settings properties.

- [ ] **Step 3: Implement nested setting types, configs, defaults, normalization, patch helpers, and CSS variables**

In `src/settings.ts`, add these exported types and helpers:

```ts
export type AnchorPart = 'main' | 'center' | 'outer' | 'guide' | 'edge'

export type AnchorPartSettings = {
  opacity: number
  size: number
  thickness: number
  color: string
  glow: number
}

export type AnchorStyleSettings = {
  backdrop: number
  activePart: AnchorPart
  parts: Partial<Record<AnchorPart, AnchorPartSettings>>
}

export type AnchorPartConfig = {
  labelKey: AnchorPart
  defaults: AnchorPartSettings
  size: { min: number; max: number; step: number }
}

export type AnchorStyleConfig = {
  defaultBackdrop: number
  defaultPart: AnchorPart
  parts: Partial<Record<AnchorPart, AnchorPartConfig>>
}
```

Define `ANCHOR_STYLE_CONFIGS` with all current anchor styles. Use `main` for simple styles. Use compound parts for existing compound renderers:

```ts
export const ANCHOR_STYLE_CONFIGS = {
  crosshair: styleConfig('main', { main: partConfig({ size: 120 }) }),
  ring: styleConfig('main', { main: partConfig({ size: 104, sizeMin: 40, sizeMax: 280, sizeStep: 2 }) }),
  fullGuide: styleConfig('guide', {
    guide: partConfig({ opacity: 0.5, size: 160, sizeMin: 80, sizeMax: 640, sizeStep: 8 }),
    center: partConfig({ size: 72, sizeMin: 32, sizeMax: 220, sizeStep: 2 }),
  }),
  horizontal: styleConfig('main', { main: partConfig({ opacity: 0.62, size: 160, sizeMin: 80, sizeMax: 640, sizeStep: 8 }) }),
  vertical: styleConfig('main', { main: partConfig({ opacity: 0.62, size: 160, sizeMin: 80, sizeMax: 640, sizeStep: 8 }) }),
  cornerBrackets: styleConfig('main', { main: partConfig({ size: 136, sizeMin: 48, sizeMax: 360, sizeStep: 4 }) }),
  boxCircle: styleConfig('center', {
    center: partConfig({ size: 96, sizeMin: 40, sizeMax: 260, sizeStep: 2 }),
    outer: partConfig({ size: 148, sizeMin: 48, sizeMax: 360, sizeStep: 4 }),
  }),
  edgeBars: styleConfig('center', {
    center: partConfig({ size: 88, sizeMin: 40, sizeMax: 260, sizeStep: 2 }),
    outer: partConfig({ size: 180, sizeMin: 64, sizeMax: 420, sizeStep: 4 }),
  }),
  tBars: styleConfig('center', {
    center: partConfig({ size: 84, sizeMin: 40, sizeMax: 260, sizeStep: 2 }),
    outer: partConfig({ size: 132, sizeMin: 48, sizeMax: 360, sizeStep: 4 }),
  }),
  dotMatrix: styleConfig('center', {
    center: partConfig({ size: 88, sizeMin: 40, sizeMax: 260, sizeStep: 2 }),
    outer: partConfig({ size: 148, sizeMin: 48, sizeMax: 360, sizeStep: 4 }),
  }),
} satisfies Record<AnchorStyle, AnchorStyleConfig>
```

Implement `styleConfig`, `partConfig`, `createDefaultStyleSettings`, `normalizeOverlaySettings`, `activeAnchorStyleSettings`, `activeAnchorPart`, `activeAnchorPartSettings`, `activePartConfig`, `patchActiveStyleSettings`, and `patchActivePartSettings`. `patchSettings` should call `normalizeOverlaySettings({ ...current, ...patch })`.

Update `overlayCssVars(settings)` to normalize settings, read the active part as the legacy `--anchor-*` variables, emit `--backdrop-opacity` from the active style, and emit part-specific variables for every part present in the current style:

```ts
return {
  '--overlay-opacity': String(activePart.opacity),
  '--anchor-size': `${activePart.size}px`,
  '--anchor-thickness': `${activePart.thickness}px`,
  '--anchor-color': activePart.color,
  '--anchor-glow': String(activePart.glow),
  '--backdrop-opacity': String(activeStyle.backdrop),
  '--anchor-offset-y': `${normalized.offsetY}px`,
  '--anchor-center-opacity': String(center.opacity),
  '--anchor-center-size': `${center.size}px`,
  '--anchor-center-thickness': `${center.thickness}px`,
  '--anchor-center-color': center.color,
  '--anchor-center-glow': String(center.glow),
  '--anchor-outer-opacity': String(outer.opacity),
  '--anchor-outer-size': `${outer.size}px`,
  '--anchor-outer-thickness': `${outer.thickness}px`,
  '--anchor-outer-color': outer.color,
  '--anchor-outer-glow': String(outer.glow),
}
```

- [ ] **Step 4: Run the focused tests to verify pass**

Run: `npm test -- src/settings.test.ts --run`

Expected: all `settings helpers` tests pass.

### Task 2: Rust Settings Model And Legacy Migration

**Files:**
- Modify: `src-tauri/src/settings.rs`

- [ ] **Step 1: Write failing Rust tests for nested serialization, validation, and legacy migration**

In `src-tauri/src/settings.rs`, update the tests to assert nested defaults and add:

```rust
#[test]
fn legacy_json_migrates_visual_fields_into_current_style_parts() {
    let json = r##"{
        "enabled": true,
        "style": "boxCircle",
        "opacity": 0.5,
        "size": 160,
        "thickness": 3,
        "color": "#ffffff",
        "glow": 0.2,
        "backdrop": 0.16,
        "offsetY": 0,
        "language": "zh",
        "shortcut": "Ctrl+Alt+V"
    }"##;

    let decoded: OverlaySettings = serde_json::from_str(json).expect("deserialize legacy settings");

    let style = decoded
        .style_settings
        .get(&AnchorStyle::BoxCircle)
        .expect("boxCircle settings");
    assert_eq!(style.backdrop, 0.16);
    assert_eq!(style.parts.get(&AnchorPart::Center).unwrap().color, "#ffffff");
    assert_eq!(style.parts.get(&AnchorPart::Center).unwrap().size, 160);
    assert_eq!(style.parts.get(&AnchorPart::Outer).unwrap().size, 160);
}

#[test]
fn validation_clamps_nested_part_settings() {
    let mut settings = OverlaySettings::default();
    let style = settings
        .style_settings
        .get_mut(&AnchorStyle::BoxCircle)
        .expect("boxCircle settings");
    style.backdrop = 9.0;
    style.active_part = AnchorPart::Outer;
    style.parts.insert(
        AnchorPart::Outer,
        AnchorPartSettings {
            opacity: 3.0,
            size: 999,
            thickness: 99,
            color: "#ffffff".to_string(),
            glow: 9.0,
        },
    );

    let validated = settings.validated().expect("settings should validate");
    let style = validated.style_settings.get(&AnchorStyle::BoxCircle).unwrap();
    let outer = style.parts.get(&AnchorPart::Outer).unwrap();

    assert_eq!(style.backdrop, 0.45);
    assert_eq!(outer.opacity, 1.0);
    assert_eq!(outer.size, 360);
    assert_eq!(outer.thickness, 8);
    assert_eq!(outer.glow, 1.0);
}
```

- [ ] **Step 2: Run the focused Rust tests to verify failure**

Run: `cd src-tauri && cargo test settings::tests --lib`

Expected: compile errors for `AnchorPart`, `style_settings`, and nested setting structs.

- [ ] **Step 3: Implement nested Rust structs and serde migration**

In `src-tauri/src/settings.rs`:

- Derive `Hash` for `AnchorStyle` so it can key a `HashMap`.
- Add `AnchorPart`, `AnchorPartSettings`, and `AnchorStyleSettings`.
- Replace top-level visual fields on `OverlaySettings` with `style_settings: HashMap<AnchorStyle, AnchorStyleSettings>`.
- Use a custom `Deserialize` implementation or an untagged raw settings enum to support both nested and legacy JSON.
- Implement defaults with helper functions mirroring the TypeScript config.
- Update `validated()` to fill missing styles/parts, clamp nested values, validate nested colors, clamp style backdrop, and ensure `active_part` exists for that style.

The Rust serialized field names should remain camelCase, so `style_settings` serializes as `styleSettings` and enum variants serialize as the current TypeScript strings.

- [ ] **Step 4: Run the focused Rust tests to verify pass**

Run: `cd src-tauri && cargo test settings::tests --lib`

Expected: all settings module tests pass.

### Task 3: React UI Editing For Active Style And Part

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Add UI text for anchor parts**

In `src/i18n.ts`, add `anchorParts` to `UiText` with labels for `main`, `center`, `outer`, `guide`, and `edge`:

```ts
anchorParts: {
  main: '整体',
  center: '中间',
  outer: '周围',
  guide: '辅助线',
  edge: '边缘',
}
```

English labels:

```ts
anchorParts: {
  main: 'Whole',
  center: 'Center',
  outer: 'Outer',
  guide: 'Guide',
  edge: 'Edge',
}
```

- [ ] **Step 2: Update App controls to use active helpers**

In `src/App.tsx`, import:

```ts
activeAnchorPartSettings,
activeAnchorStyleSettings,
activePartConfig,
ANCHOR_STYLE_CONFIGS,
patchActivePartSettings,
patchActiveStyleSettings,
type AnchorPart,
```

Inside `App`, compute:

```ts
const normalizedSettings = useMemo(() => normalizeOverlaySettings(settings), [settings])
const activeStyle = activeAnchorStyleSettings(normalizedSettings)
const activePart = activeAnchorPartSettings(normalizedSettings)
const selectedPartConfig = activePartConfig(normalizedSettings)
const currentStyleConfig = ANCHOR_STYLE_CONFIGS[normalizedSettings.style]
const partOptions = Object.keys(currentStyleConfig.parts) as AnchorPart[]
```

Use `normalizedSettings` for preview variables and overlay rendering. Keep the style select patch as `{ style }`, but update visual controls:

```tsx
{partOptions.length > 1 ? (
  <div className="part-switch" role="group" aria-label={text.fields.anchorPart}>
    {partOptions.map((part) => (
      <button
        key={part}
        type="button"
        className={activeStyle.activePart === part ? 'is-active' : ''}
        aria-pressed={activeStyle.activePart === part}
        onClick={() => commitPatch(patchActiveStyleSettings(normalizedSettings, { activePart: part }))}
      >
        {text.anchorParts[part]}
      </button>
    ))}
  </div>
) : null}
```

For opacity/color/size/thickness/glow, use `activePart` values and commit with:

```ts
commitPatch(patchActivePartSettings(normalizedSettings, { opacity }))
```

For backdrop, use `activeStyle.backdrop` and commit with:

```ts
commitPatch(patchActiveStyleSettings(normalizedSettings, { backdrop }))
```

For size min/max/step, use `selectedPartConfig.size`.

- [ ] **Step 3: Run frontend tests and lint**

Run: `npm test -- --run`

Expected: all Vitest suites pass.

Run: `npm run lint`

Expected: no lint errors.

### Task 4: CSS Part Variables For Compound Anchors

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Add part-specific CSS variable defaults**

In `.overlay-surface`, add defaults for `main`, `center`, `outer`, `guide`, and `edge` variables. Keep legacy `--anchor-*` defaults as active-part aliases.

```css
--anchor-center-opacity: var(--overlay-opacity);
--anchor-center-size: var(--anchor-size);
--anchor-center-thickness: var(--anchor-thickness);
--anchor-center-color: var(--anchor-color);
--anchor-center-glow: var(--anchor-glow);
--anchor-outer-opacity: var(--overlay-opacity);
--anchor-outer-size: var(--anchor-size);
--anchor-outer-thickness: var(--anchor-thickness);
--anchor-outer-color: var(--anchor-color);
--anchor-outer-glow: var(--anchor-glow);
```

- [ ] **Step 2: Route existing element groups to the right part variables**

Use center variables for `.anchor-horizontal`, `.anchor-vertical`, and `.anchor-ring` in compound styles. Use outer variables for `.anchor-box`, `.anchor-t`, and `.anchor-dots`. Keep simple styles readable by letting `main` resolve through the existing active `--anchor-*` aliases.

For example:

```css
.overlay-surface[data-anchor-style='boxCircle'] .anchor-ring {
  width: calc(var(--anchor-center-size) * 0.42);
  height: calc(var(--anchor-center-size) * 0.42);
  border-color: var(--anchor-center-color);
  opacity: var(--anchor-center-opacity);
}

.overlay-surface[data-anchor-style='boxCircle'] .anchor-box {
  background: var(--anchor-outer-color);
  opacity: var(--anchor-outer-opacity);
  filter: drop-shadow(0 0 calc(20px * var(--anchor-outer-glow)) var(--anchor-outer-color));
}
```

Apply equivalent routing to `edgeBars`, `tBars`, `dotMatrix`, and `fullGuide`.

- [ ] **Step 3: Run the frontend build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

### Task 5: End-To-End Verification

**Files:**
- No planned code edits.

- [ ] **Step 1: Run all automated tests**

Run: `npm test -- --run`

Expected: all Vitest suites pass.

Run: `cd src-tauri && cargo test --lib`

Expected: all Rust lib tests pass.

- [ ] **Step 2: Build the app**

Run: `npm run build`

Expected: build completes without TypeScript or Vite errors.

- [ ] **Step 3: Manual smoke test in browser preview**

Run: `npm run dev -- --host 127.0.0.1`

Open the local URL. Verify:

- Selecting `boxCircle` shows a part selector.
- Editing `center` color changes the center ring without changing outer boxes.
- Editing `outer` size changes outer boxes without changing the center ring.
- Switching away from `boxCircle` and back restores both part settings.
- Editing backdrop dims the whole preview, not only one part.

Stop the dev server after verification.

