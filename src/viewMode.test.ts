import { describe, expect, it } from 'vitest'
import { applyDocumentViewMode } from './viewMode'

describe('applyDocumentViewMode', () => {
  it('marks both html and body as overlay so the webview can stay transparent', () => {
    const documentLike = {
      documentElement: { dataset: {} as DOMStringMap },
      body: { dataset: {} as DOMStringMap },
    }

    applyDocumentViewMode(documentLike, true)

    expect(documentLike.documentElement.dataset.view).toBe('overlay')
    expect(documentLike.body.dataset.view).toBe('overlay')
  })
})
