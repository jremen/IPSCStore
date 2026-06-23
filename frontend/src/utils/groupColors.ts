const PALETTE = [
  '#f59e0b', // amber
  '#14b8a6', // teal
  '#a855f7', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f43f5e', // rose
  '#0ea5e9', // sky
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#f97316', // orange
  '#ef4444', // red
];

const groupColorMap = new Map<string, number>();
let nextColorIndex = 0;

export function seedGroupColors(groupIds: (string | null | undefined)[]) {
  const unique = [...new Set(groupIds.filter((id): id is string => !!id))].sort();
  groupColorMap.clear();
  nextColorIndex = 0;
  for (const id of unique) {
    if (!groupColorMap.has(id)) {
      groupColorMap.set(id, nextColorIndex % PALETTE.length);
      nextColorIndex++;
    }
  }
}

export function groupColor(groupId: string): string {
  if (groupColorMap.has(groupId)) {
    return PALETTE[groupColorMap.get(groupId)!];
  }
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = (hash * 31 + groupId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
