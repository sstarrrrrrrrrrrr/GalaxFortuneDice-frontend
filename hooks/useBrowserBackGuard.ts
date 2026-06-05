import { useCallback, useEffect, useId, useRef } from 'react'
import { useLatestRef } from './useLatestRef'

const GUARD_STATE_KEY = '__galaxBrowserBackGuard'

// Intercepts browser back while allowing controlled in-app navigation to remove the guard first.
export function useBrowserBackGuard(onBackAttempt: () => void, enabled = true) {
  const onBackAttemptRef = useLatestRef(onBackAttempt)
  const guardId = useId()
  const pendingNavigationRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!enabled) return

    const currentState = window.history.state as Record<string, unknown> | null

    if (currentState?.[GUARD_STATE_KEY] !== guardId) {
      window.history.pushState(
        {
          ...(currentState ?? {}),
          [GUARD_STATE_KEY]: guardId,
        },
        '',
        window.location.href,
      )
    }

    function handlePopState() {
      const pendingNavigation = pendingNavigationRef.current

      if (pendingNavigation) {
        pendingNavigationRef.current = null
        pendingNavigation()
        return
      }

      window.history.pushState(
        {
          ...(window.history.state ?? {}),
          [GUARD_STATE_KEY]: guardId,
        },
        '',
        window.location.href,
      )
      onBackAttemptRef.current()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [enabled, guardId, onBackAttemptRef])

  return useCallback((navigate: () => void) => {
    if (!enabled) {
      navigate()
      return
    }

    pendingNavigationRef.current = navigate
    window.history.back()
  }, [enabled])
}
