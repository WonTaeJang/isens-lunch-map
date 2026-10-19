/** The viewer asked the system for less motion: animations jump straight to their end. */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
