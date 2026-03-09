// Calculate multiplier based on level
// Linear progression: L1=1x, L2=1.5x, L3=2x, L4=2.5x, etc
export function getMultiplier(level: number): number {
  if (level < 1) return 1;
  if (level > 10) level = 10;
  
  // Linear: 1 + (level - 1) * 0.5
  return 1 + (level - 1) * 0.5;
}

// Calculate earned screen time based on activity duration and user level
// Example: 15 min chore at L1 = 20 min screen time
export function calculateScreenTime(
  activityDurationMinutes: number,
  userLevel: number,
  baseScreenTimeMinutes: number
): { earnedMinutes: number; multiplier: number } {
  const multiplier = getMultiplier(userLevel);
  const earnedMinutes = Math.floor(baseScreenTimeMinutes * multiplier);
  
  return {
    earnedMinutes,
    multiplier,
  };
}

// Get all multiplier values for reference
export function getMultiplierTable(): Record<number, number> {
  const table: Record<number, number> = {};
  for (let level = 1; level <= 10; level++) {
    table[level] = getMultiplier(level);
  }
  return table;
}
