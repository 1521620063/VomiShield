type ContextMenuCapableDocument = Pick<Document, 'addEventListener'>

export function installDesktopExperience(documentLike: ContextMenuCapableDocument) {
  documentLike.addEventListener('contextmenu', (event) => {
    event.preventDefault()
  })
}
