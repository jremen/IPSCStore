const PALETTE = [
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#a855f7', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f43f5e', // rose
  '#0ea5e9', // sky
];

export function groupColor(groupId: string): string {
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = (hash * 31 + groupId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
