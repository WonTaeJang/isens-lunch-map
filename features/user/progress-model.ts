export function percent(part: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, part / total * 100)) : 0;
}
