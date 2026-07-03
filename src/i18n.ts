export const LANGUAGES = ['zh', 'en'] as const

export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'zh'

export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
]

type AnchorStyleLabels = {
  crosshair: string
  ring: string
  fullGuide: string
  horizontal: string
  vertical: string
  cornerBrackets: string
  boxCircle: string
  edgeBars: string
  tBars: string
  dotMatrix: string
}

type AnchorPartLabels = {
  main: string
  center: string
  outer: string
  guide: string
  edge: string
}

type FieldLabels = {
  anchorStyle: string
  anchorPart: string
  shortcut: string
  opacity: string
  color: string
  size: string
  thickness: string
  inset: string
  glow: string
  backdrop: string
  offsetY: string
}

type StatusLabels = {
  ready: string
  editing: string
  saving: string
  saved: string
  overlayEnabled: string
  overlayDisabled: string
  saveFailed: string
  syncFailed: string
}

type UiText = {
  tagline: string
  compatibilityNote: string
  languageSwitchLabel: string
  powerOn: string
  powerOff: string
  fields: FieldLabels
  anchorStyles: AnchorStyleLabels
  anchorParts: AnchorPartLabels
  statuses: StatusLabels
  statusDetailSeparator: string
  shortcut: string
  shortcutRecording: string
  shortcutHint: string
  shortcutErrors: {
    missingModifier: string
    missingKey: string
    unsupportedKey: string
  }
}

export const UI_TEXT = {
  zh: {
    tagline: '为窗口化和无边框 3D 游戏提供稳定的视觉锚点。',
    compatibilityNote: '仅在无边框窗口化或窗口化模式生效，全屏模式不生效。',
    languageSwitchLabel: '切换界面语言',
    powerOn: '开',
    powerOff: '关',
    fields: {
      anchorStyle: '锚点样式',
      anchorPart: '锚点部分',
      shortcut: '快捷键',
      opacity: '透明度',
      color: '颜色',
      size: '尺寸',
      thickness: '线宽',
      inset: '向内收缩',
      glow: '发光',
      backdrop: '背景压暗',
      offsetY: '垂直偏移',
    },
    anchorStyles: {
      crosshair: '十字准星',
      ring: '中心圆环',
      fullGuide: '全屏辅助线',
      horizontal: '水平线',
      vertical: '垂直线',
      cornerBrackets: '角标框',
      boxCircle: '方块圆环',
      edgeBars: '四向长条',
      tBars: 'T 形参考',
      dotMatrix: '点阵参考',
    },
    anchorParts: {
      main: '整体',
      center: '中间',
      outer: '周围',
      guide: '辅助线',
      edge: '边缘',
    },
    statuses: {
      ready: '就绪',
      editing: '编辑中...',
      saving: '保存中...',
      saved: '已保存',
      overlayEnabled: '辅助线已开启',
      overlayDisabled: '辅助线已关闭',
      saveFailed: '保存失败',
      syncFailed: '同步失败',
    },
    statusDetailSeparator: '：',
    shortcut: '快捷键',
    shortcutRecording: '按下新的快捷键',
    shortcutHint: '至少包含 Ctrl、Alt、Shift 或 Cmd 之一',
    shortcutErrors: {
      missingModifier: '请至少包含一个修饰键',
      missingKey: '请再按一个非修饰键',
      unsupportedKey: '不支持这个按键',
    },
  },
  en: {
    tagline: 'Stable visual anchors for windowed and borderless 3D games.',
    compatibilityNote: 'Works only in borderless windowed or windowed mode, not fullscreen.',
    languageSwitchLabel: 'Switch interface language',
    powerOn: 'On',
    powerOff: 'Off',
    fields: {
      anchorStyle: 'Anchor style',
      anchorPart: 'Anchor part',
      shortcut: 'Shortcut',
      opacity: 'Opacity',
      color: 'Color',
      size: 'Size',
      thickness: 'Thickness',
      inset: 'Inset',
      glow: 'Glow',
      backdrop: 'Background dim',
      offsetY: 'Vertical offset',
    },
    anchorStyles: {
      crosshair: 'Crosshair',
      ring: 'Center ring',
      fullGuide: 'Full guide',
      horizontal: 'Horizontal line',
      vertical: 'Vertical line',
      cornerBrackets: 'Corner brackets',
      boxCircle: 'Box and circle',
      edgeBars: 'Edge bars',
      tBars: 'T-bar target',
      dotMatrix: 'Dot matrix',
    },
    anchorParts: {
      main: 'Whole',
      center: 'Center',
      outer: 'Outer',
      guide: 'Guide',
      edge: 'Edge',
    },
    statuses: {
      ready: 'Ready',
      editing: 'Editing...',
      saving: 'Saving...',
      saved: 'Saved',
      overlayEnabled: 'Overlay enabled',
      overlayDisabled: 'Overlay disabled',
      saveFailed: 'Save failed',
      syncFailed: 'Sync failed',
    },
    statusDetailSeparator: ': ',
    shortcut: 'Shortcut',
    shortcutRecording: 'Press the new shortcut',
    shortcutHint: 'Use at least one of Ctrl, Alt, Shift, or Cmd',
    shortcutErrors: {
      missingModifier: 'Use at least one modifier',
      missingKey: 'Press one non-modifier key too',
      unsupportedKey: 'This key is not supported',
    },
  },
} satisfies Record<Language, UiText>

export function getUiText(language: Language) {
  return UI_TEXT[language]
}
