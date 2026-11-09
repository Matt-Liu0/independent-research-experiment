import { useEffect, useState } from 'react'

/**
 * Whether a phone is held sideways. Uses the screen's orientation, not the page's shape: on
 * Android the keyboard shrinks the page until it is wider than tall, which a CSS
 * (orientation: landscape) query reads as sideways while the participant is typing.
 */
export function isSideways(scr: Screen = screen, win: Window = window): boolean {
  const type = scr.orientation?.type
  // Older iOS Safari has no screen.orientation; window.orientation is ±90 when sideways.
  const landscape = type
    ? type.startsWith('landscape')
    : Math.abs(Number((win as Window & { orientation?: number }).orientation ?? 0)) === 90
  return landscape && Math.min(scr.width, scr.height) <= 500
}

export function useSideways(): boolean {
  const [sideways, setSideways] = useState(isSideways)
  useEffect(() => {
    const check = () => setSideways(isSideways())
    screen.orientation?.addEventListener('change', check)
    window.addEventListener('orientationchange', check)
    window.addEventListener('resize', check)
    return () => {
      screen.orientation?.removeEventListener('change', check)
      window.removeEventListener('orientationchange', check)
      window.removeEventListener('resize', check)
    }
  }, [])
  return sideways
}
