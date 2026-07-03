import { describe, expect, it } from 'vitest'
import { installDesktopExperience } from './desktopExperience'

describe('installDesktopExperience', () => {
  it('suppresses the default webview context menu', () => {
    const target = new EventTarget()
    installDesktopExperience(target)

    const event = new Event('contextmenu', { cancelable: true })
    target.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
