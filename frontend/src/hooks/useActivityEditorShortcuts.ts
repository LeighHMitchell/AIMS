import { useEffect, useRef } from "react"

/**
 * Returns true if the event target is an editable surface (input, textarea,
 * contenteditable) — used to decide whether a shortcut should fire or defer
 * to the field's own behavior (e.g. Enter inside a textarea must insert a line,
 * not save the activity).
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return false
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPod|iPad/.test(navigator.platform)
}

export interface ActivityEditorShortcutHandlers {
  onOpenPalette: () => void
  onOpenCheatsheet: () => void
  onNextSection: () => void
  onPreviousSection: () => void
  onSave: () => void
  /** Optional: pressed when Esc is used while no modal/palette is open */
  onEscape?: () => void
}

/**
 * Global keyboard shortcuts for the Activity Editor.
 *
 * Shortcuts:
 *   Cmd/Ctrl + K       → Open quick-jump palette
 *   Cmd/Ctrl + /       → Open keyboard cheatsheet
 *   Cmd/Ctrl + ↓       → Next section
 *   Cmd/Ctrl + ↑       → Previous section
 *   Cmd/Ctrl + Enter   → Save the activity
 *   Esc                → onEscape (usually close modal/palette)
 *
 * Tab / Shift+Tab remains the browser default for field-to-field movement.
 */
export function useActivityEditorShortcuts(
  handlers: ActivityEditorShortcutHandlers,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  // Keep the latest handlers in a ref so we don't re-bind the listener on each render.
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return

    const handler = (event: KeyboardEvent) => {
      const mod = isMac() ? event.metaKey : event.ctrlKey
      // Cmd/Ctrl must be held for almost every shortcut (Esc is the exception)
      const editable = isEditableTarget(event.target)

      // Cmd/Ctrl + K — open palette (works even from inside an editable field)
      if (mod && (event.key === "k" || event.key === "K") && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        ref.current.onOpenPalette()
        return
      }

      // Cmd/Ctrl + / — open cheatsheet (works from inside an editable field)
      if (mod && event.key === "/" && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        ref.current.onOpenCheatsheet()
        return
      }

      // Cmd/Ctrl + ↓ / ↑ — section navigation (allowed inside editable fields
      // because Cmd+arrow is a unique chord unlikely to conflict with text editing)
      if (mod && event.key === "ArrowDown" && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        ref.current.onNextSection()
        return
      }
      if (mod && event.key === "ArrowUp" && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        ref.current.onPreviousSection()
        return
      }

      // Cmd/Ctrl + Enter — save. Works even inside textareas (standard pattern:
      // Enter inserts newline, Cmd/Ctrl+Enter submits).
      if (mod && event.key === "Enter" && !event.shiftKey && !event.altKey) {
        event.preventDefault()
        ref.current.onSave()
        return
      }

      // Esc — let the parent decide (close palette, modal, or revert focus)
      if (event.key === "Escape" && !mod && !event.shiftKey && !event.altKey) {
        if (ref.current.onEscape) {
          // Don't preventDefault — parent may want native behavior
          ref.current.onEscape()
        }
        return
      }

      // Suppress unused editable warning — we kept the variable for clarity
      void editable
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [enabled])
}

/** Platform-aware rendering of a modifier key name */
export function modKeyLabel(): string {
  return isMac() ? "⌘" : "Ctrl"
}
