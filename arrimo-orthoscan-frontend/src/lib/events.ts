export const DB_CHANGED_EVENT = 'arrimo:db_changed'

export function emitDbChanged(): void {
  window.dispatchEvent(new Event(DB_CHANGED_EVENT))
}

export function onDbChanged(handler: () => void): () => void {
  window.addEventListener(DB_CHANGED_EVENT, handler)
  return () => window.removeEventListener(DB_CHANGED_EVENT, handler)
}
