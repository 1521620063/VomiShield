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
})
