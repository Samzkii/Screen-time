// ==========================================
// XP & LEVEL SYSTEM
// ==========================================

import { LevelConfig, User } from '@/lib/types';
import { query } from '@/lib/db';

/**
 * Standard level configuration (can be overridden per family)
 */
export const DEFAULT_LEVEL_CONFIG: Record<number, { threshold: number; dailyScreenTime: number }> = {
  1: { threshold: 0, dailyScreenTime: 20 },
  2: { threshold: 100, dailyScreenTime: 30 },
  3: { threshold: 300, dailyScreenTime: 45 },
  4: { threshold: 700, dailyScreenTime: 60 },
  5: { threshold: 1200, dailyScreenTime: 75 },
  6: { threshold: 1800, dailyScreenTime: 90 },
  7: { threshold: 2500, dailyScreenTime: 105 },
  8: { threshold: 3300, dailyScreenTime: 120 },
  9: { threshold: 4200, dailyScreenTime: 135 },
  10: { threshold: 5200, dailyScreenTime: 150 },
};

export const XP_MULTIPLIERS_BY_DIFFICULTY = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

/**
 * Initialize default level configurations for a family
 */
export async function initializeFamilyLevelConfig(familyId: number): Promise<void> {
  for (const [level, config] of Object.entries(DEFAULT_LEVEL_CONFIG)) {
    await query(
      `INSERT INTO level_config (family_id, level, xp_threshold, daily_screen_time_minutes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [familyId, parseInt(level), config.threshold, config.dailyScreenTime]
    );
  }
}

/**
 * Get level configuration for a family
 */
export async function getLevelConfig(familyId: number): Promise<LevelConfig[]> {
  const result = await query(
    `SELECT id, family_id as "familyId", level, xp_threshold as "xpThreshold", 
            daily_screen_time_minutes as "dailyScreenTimeMinutes", created_at as "createdAt"
     FROM level_config
     WHERE family_id = $1 OR family_id IS NULL
     ORDER BY level ASC`,
    [familyId]
  );
  return result.rows;
}

/**
 * Calculate current level based on total XP
 */
export async function calculateLevel(familyId: number, totalXp: number): Promise<number> {
  const levelConfig = await getLevelConfig(familyId);
  
  // Find the highest level where xpThreshold <= totalXp
  let level = 1;
  for (const config of levelConfig) {
    if (config.xpThreshold <= totalXp) {
      level = config.level;
    } else {
      break;
    }
  }
  
  return level;
}

/**
 * Get next level info
 */
export async function getNextLevelInfo(familyId: number, currentXp: number): Promise<{ xpNeeded: number; nextLevel: number } | null> {
  const levelConfig = await getLevelConfig(familyId);
  
  for (const config of levelConfig) {
    if (config.xpThreshold > currentXp) {
      const currentLevel = await calculateLevel(familyId, currentXp);
      return {
        nextLevel: config.level,
        xpNeeded: config.xpThreshold - currentXp,
      };
    }
  }
  
  return null;
}

/**
 * Get daily screen time limit for user's level
 */
export async function getDailyScreenTimeLimit(familyId: number, level: number): Promise<number> {
  const result = await query(
    `SELECT daily_screen_time_minutes as "dailyScreenTimeMinutes"
     FROM level_config
     WHERE (family_id = $1 OR family_id IS NULL) AND level = $2
     ORDER BY family_id DESC NULLS LAST
     LIMIT 1`,
    [familyId, level]
  );
  
  if (result.rows.length === 0) {
    return DEFAULT_LEVEL_CONFIG[Math.min(level, 10)].dailyScreenTime;
  }
  
  return result.rows[0].dailyScreenTimeMinutes;
}

/**
 * Award XP for completed activity
 */
export async function awardXpForActivity(
  familyId: number,
  childId: number,
  baseXp: number,
  difficulty: 'easy' | 'medium' | 'hard',
  activityCompletionId: number,
  createdBy?: number
): Promise<{ xpAwarded: number; leveledUp: boolean; newLevel: number }> {
  
  // Apply difficulty multiplier
  const xpAwarded = Math.floor(baseXp * XP_MULTIPLIERS_BY_DIFFICULTY[difficulty]);
  
  // Get current XP before award
  const userResult = await query(
    `SELECT total_xp, current_level FROM users WHERE id = $1`,
    [childId]
  );
  
  const previousXp = userResult.rows[0].total_xp;
  const previousLevel = userResult.rows[0].current_level;
  
  // Update user XP
  await query(
    `UPDATE users SET total_xp = total_xp + $1, updated_at = NOW() WHERE id = $2`,
    [xpAwarded, childId]
  );
  
  // Calculate new level
  const newLevel = await calculateLevel(familyId, previousXp + xpAwarded);
  const leveledUp = newLevel > previousLevel;
  
  // Update level if changed
  if (leveledUp) {
    await query(
      `UPDATE users SET current_level = $1, updated_at = NOW() WHERE id = $2`,
      [newLevel, childId]
    );
  }
  
  // Log XP transaction
  await query(
    `INSERT INTO xp_transactions (family_id, child_id, amount, type, reference_id, reference_type, created_by, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [familyId, childId, xpAwarded, 'completion', activityCompletionId, 'activity_completion', createdBy || null, `Activity completed`]
  );
  
  // Update daily screen time limit
  if (leveledUp) {
    const newScreenTimeLimit = await getDailyScreenTimeLimit(familyId, newLevel);
    await query(
      `UPDATE users SET daily_screen_time_limit = $1 WHERE id = $2`,
      [newScreenTimeLimit, childId]
    );
  }
  
  return {
    xpAwarded,
    leveledUp,
    newLevel,
  };
}

/**
 * Apply bonus or penalty XP
 */
export async function applyManualXpAdjustment(
  familyId: number,
  childId: number,
  amount: number,
  reason: string,
  createdBy: number
): Promise<{ newTotalXp: number; newLevel: number; leveledUp: boolean }> {
  
  const userResult = await query(
    `SELECT total_xp, current_level FROM users WHERE id = $1`,
    [childId]
  );
  
  const previousXp = userResult.rows[0].total_xp;
  const previousLevel = userResult.rows[0].current_level;
  const newTotalXp = Math.max(0, previousXp + amount); // Prevent negative XP
  
  // Update user XP
  await query(
    `UPDATE users SET total_xp = $1, updated_at = NOW() WHERE id = $2`,
    [newTotalXp, childId]
  );
  
  // Calculate new level
  const newLevel = await calculateLevel(familyId, newTotalXp);
  const leveledUp = newLevel > previousLevel;
  
  // Update level if changed
  if (leveledUp) {
    await query(
      `UPDATE users SET current_level = $1, updated_at = NOW() WHERE id = $2`,
      [newLevel, childId]
    );
  }
  
  // Log transaction
  const txType = amount > 0 ? 'bonus' : 'penalty';
  await query(
    `INSERT INTO xp_transactions (family_id, child_id, amount, type, reason, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [familyId, childId, amount, txType, reason, createdBy]
  );
  
  return {
    newTotalXp,
    newLevel,
    leveledUp,
  };
}

/**
 * Get XP transactions for a child
 */
export async function getXpTransactionHistory(childId: number, limit: number = 50) {
  const result = await query(
    `SELECT id, family_id as "familyId", child_id as "childId", amount, type, 
            reference_id as "referenceId", reference_type as "referenceType", 
            reason, created_by as "createdBy", created_at as "createdAt"
     FROM xp_transactions
     WHERE child_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [childId, limit]
  );
  
  return result.rows;
}

/**
 * Check and award achievements based on user progress
 */
export async function checkAndAwardAchievements(familyId: number, childId: number): Promise<any[]> {
  // TODO: Implement achievement checking logic
  // This should check various triggers like total activities, XP milestones, levels, etc.
  // For now, return empty array
  return [];
}
