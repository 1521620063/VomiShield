import { describe, expect, it } from 'vitest'
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, UI_TEXT } from './i18n'
import type { AnchorStyle } from './settings'

const ANCHOR_STYLES: AnchorStyle[] = [
  'crosshair',
  'ring',
  'fullGuide',
  'horizontal',
  'vertical',
  'cornerBrackets',
  'boxCircle',
  'edgeBars',
  'tBars',
  'dotMatrix',
]

describe('i18n', () => {
  it('defaults the interface to Chinese', () => {
    expect(DEFAULT_LANGUAGE).toBe('zh')
  })

  it('provides labels for every supported anchor style in each language', () => {
    for (const { value: language } of LANGUAGE_OPTIONS) {
      for (const style of ANCHOR_STYLES) {
        expect(UI_TEXT[language].anchorStyles[style]).not.toBe('')
      }
    }
  })

  it('provides shortcut recording labels and errors in each language', () => {
    for (const { value: language } of LANGUAGE_OPTIONS) {
      expect(UI_TEXT[language].fields.shortcut).not.toBe('')
      expect(UI_TEXT[language].shortcutRecording).not.toBe('')
      expect(UI_TEXT[language].shortcutErrors.missingModifier).not.toBe('')
      expect(UI_TEXT[language].shortcutErrors.missingKey).not.toBe('')
      expect(UI_TEXT[language].shortcutErrors.unsupportedKey).not.toBe('')
    }
  })

  it('provides automatic update labels in each language', () => {
    for (const { value: language } of LANGUAGE_OPTIONS) {
      expect(UI_TEXT[language].updates.idle).not.toBe('')
      expect(UI_TEXT[language].updates.checking).not.toBe('')
      expect(UI_TEXT[language].updates.available).toContain('{version}')
      expect(UI_TEXT[language].updates.downloading).toContain('{progress}')
      expect(UI_TEXT[language].updates.check).not.toBe('')
      expect(UI_TEXT[language].updates.install).not.toBe('')
    }
  })
})
