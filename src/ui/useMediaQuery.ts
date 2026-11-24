import { useSyncExternalStore } from 'react'

/** Live result of a CSS media query. */
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )

/** Phone layout below this width (spec R15). */
export const PHONE_QUERY = '(width < 900px)'

/** Touch screens: bigger handles (R15.AC3). */
export const COARSE_POINTER_QUERY = '(pointer: coarse)'
