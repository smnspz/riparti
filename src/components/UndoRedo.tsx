import { useEffect } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useTripStore } from '@/store/tripStore'

/**
 * Check whether a key event comes from a field that handles undo itself.
 *
 * @param target - Element that received the key event.
 * @returns True when the browser should keep the native text undo.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return (
    target.isContentEditable ||
    target.closest('input, textarea, select') !== null
  )
}

/**
 * Undo and redo buttons for the map overlay, plus their keyboard shortcuts.
 *
 * Shortcuts are ignored while a field or a dialog has focus, so typing keeps
 * the browser's own undo and an open dialog keeps its keys.
 *
 * @returns The undo/redo control.
 */
export function UndoRedo() {
  // Initializations
  const { t } = useI18n()
  const canUndo = useTripStore((state) => state.past.length > 0)
  const canRedo = useTripStore((state) => state.future.length > 0)
  const undo = useTripStore((state) => state.undo)
  const redo = useTripStore((state) => state.redo)

  useEffect(() => {
    /**
     * Apply Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z to the trip history.
     *
     * @param event - Key event from the window.
     * @returns Nothing. Prevents the browser default when handled.
     */
    function handleKeyDown(event: KeyboardEvent): void {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return
      }
      if (isTypingTarget(event.target)) {
        return
      }
      if (document.querySelector('[data-slot="dialog-content"]') !== null) {
        return
      }

      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        useTripStore.getState().undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        useTripStore.getState().redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-background/95 p-0.5 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={undo}
        disabled={!canUndo}
        aria-label={t('history.undo')}
        title={t('history.undo')}
      >
        <Undo2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={redo}
        disabled={!canRedo}
        aria-label={t('history.redo')}
        title={t('history.redo')}
      >
        <Redo2 />
      </Button>
    </div>
  )
}
