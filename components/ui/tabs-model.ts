export function nextTabIndex(key: string, index: number, length: number): number | null {
  if (!length) return null;
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return length - 1;
    case 'ArrowRight':
      return (index + 1) % length;
    case 'ArrowLeft':
      return (index - 1 + length) % length;
    default:
      return null;
  }
}
