/** Equal-width panels with gaps; returns zero for a single panel or a non-scrolling layout. */
export function panelStep(
  element: Pick<HTMLElement, 'scrollWidth' | 'clientWidth'>,
  count: number,
) {
  return count > 1 ? Math.max(0, element.scrollWidth - element.clientWidth) / (count - 1) : 0;
}
