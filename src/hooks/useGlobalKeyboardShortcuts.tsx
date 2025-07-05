import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { useKeyboardShortcuts } from '@/hooks/keyboard/useKeyboardShortcut'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  action: () => void
  description: string
}

export const useGlobalKeyboardShortcuts = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  const showShortcutsHelp = useCallback((shortcuts: ShortcutConfig[]) => {
    toast.info(
      <div className="space-y-2">
        <h3 className="font-semibold">Keyboard Shortcuts</h3>
        {shortcuts.map(s => (
          <div key={s.key} className="text-sm">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">
              {s.ctrl && 'Ctrl+'}
              {s.alt && 'Alt+'}
              {s.shift && 'Shift+'}
              {s.key.toUpperCase()}
            </kbd>
            <span className="ml-2">{s.description}</span>
          </div>
        ))}
      </div>,
      { duration: 10000 }
    )
  }, [toast])

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'k',
      ctrl: true,
      action: () => navigate('/kitchen'),
      description: 'Go to Kitchen Display'
    },
    {
      key: 'o',
      ctrl: true,
      action: () => navigate('/kiosk'),
      description: 'Go to Kiosk'
    },
    {
      key: 'h',
      ctrl: true,
      action: () => navigate('/history'),
      description: 'Go to Order History'
    },
    {
      key: '/',
      action: () => {
        // Focus search input if available
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      description: 'Focus search'
    },
    {
      key: '?',
      shift: true,
      action: () => showShortcutsHelp(shortcuts),
      description: 'Show keyboard shortcuts'
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modals or dialogs
        const activeModal = document.querySelector('[role="dialog"]')
        if (activeModal) {
          const closeButton = activeModal.querySelector('[aria-label*="close"]') as HTMLButtonElement
          if (closeButton) {
            closeButton.click()
          }
        }
      },
      description: 'Close modal/dialog'
    }
  ]

  useKeyboardShortcuts(shortcuts)

  return shortcuts
}