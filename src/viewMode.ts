type DocumentViewTarget = {
  documentElement: { dataset: DOMStringMap }
  body: { dataset: DOMStringMap }
}

export function applyDocumentViewMode(
  documentTarget: DocumentViewTarget,
  isOverlay: boolean,
) {
  const view = isOverlay ? 'overlay' : 'settings'
  documentTarget.documentElement.dataset.view = view
  documentTarget.body.dataset.view = view
}
