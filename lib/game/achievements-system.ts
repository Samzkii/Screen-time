// ==========================================
// ACHIEVEMENTS & BADGES SYSTEM
// ==========================================

import { query } from '@/lib/db';
import { AchievementDefinition, ChildAchievementWithDetails } from '@/lib/types';

/**
 * Default achievements for all families
 */
export const DEFAULT_ACHIEVEMENTS = [
  {
    name: 'First Steps',
    description: 'Complete your first activity',
    rarity: 'common' as const,
    triggerType: 'first_activity' as const,
    triggerValue: 1,
  },
  {
    name: 'Task Master',
    description: 'Complete 10 activities',
    rarity: 'uncommon' as const,
    triggerType: 'total_activities' as const,
    triggerValue: 10,
  },
  {
    name: 'Unstoppable',
    description: 'Complete 50 activities',
    rarity: 'rare' as const,
    triggerType: 'total_activities' as const,
    triggerValue: 50,
  },
  {
    name: 'XP Collector',
    description: 'Earn 1000 XP',
    rarity: 'rare' as const,
    triggerType: 'xp_milestone' as const,
    triggerValue: 1000,
  },
  {
    name: 'XP Master',
    description: 'Earn 5000 XP',
    rarity: 'epic' as const,
    triggerType: 'xp_milestone' as const,
    triggerValue: 5000,
  },
  {
    name: 'Rising Star',
    description: 'Reach level 5',
    rarity: 'rare' as const,
    triggerType: 'level_milestone' as const,
    triggerValue: 5,
  },
  {
    name: 'Legend',
    description: 'Reach level 10',
    rarity: 'epic' as const,
    triggerType: 'level_milestone' as const,
    triggerValue: 10,
  },
  {
    name: 'On Fire',
    description: 'Maintain a 7-day streak',
    rarity: 'rare' as const,
    triggerType: 'streak' as const,
    triggerValue: 7,
  },
];

/**
 * Initialize default achievements for a family
 */
export async function initializeFamilyAchievements(familyId: number): Promise<void> {
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    await query(
      `INSERT INTO achievement_definitions 
       (family_id, name, description, rarity, trigger_type, trigger_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        familyId,
        achievement.name,
        achievement.description,
        achievement.rarity,
        achievement.triggerType,
        achievement.triggerValue,
      ]
    );
  }
}

/**
 * Check if child should earn any achievements
 */
export async function checkAndAwardAchievements(
  familyId: number,
  childId: number
): Promise<AchievementDefinition[]> {
  
  const awardedAchievements: AchievementDefinition[] = [];
  
  // Get all available achievements for family
  const achievementsResult = await query(
    `SELECT id, family_id as "familyId", name, description, rarity, 
            trigger_type as "triggerType", trigger_value as "triggerValue", 
            badge_color as "badgeColor", created_at as "createdAt"
     FROM achievement_definitions
     WHERE family_id = $1`,
    [familyId]
  );
  
  // Check each achievement
  for (const achievement of achievementsResult.rows) {
    // Check if already earned
    const alreadyEarned = await query(
      `SELECT id FROM child_achievements WHERE child_id = $1 AND achievement_id = $2`,
      [childId, achievement.id]
    );
    
    if (alreadyEarned.rows.length > 0) {
      continue; // Already earned
    }
    
    // Check trigger conditions
    let shouldAward = false;
    
    if (achievement.triggerType === 'first_activity') {
      const completionCount = await query(
        `SELECT COUNT(*) as count FROM activity_completions 
         WHERE child_id = $1 AND status = 'approved'`,
        [childId]
      );
      shouldAward = completionCount.rows[0].count >= achievement.triggerValue;
      
    } else if (achievement.triggerType === 'total_activities') {
      const completionCount = await query(
        `SELECT COUNT(*) as count FROM activity_completions 
         WHERE child_id = $1 AND status = 'approved'`,
        [childId]
      );
      shouldAward = completionCount.rows[0].count >= achievement.triggerValue;
      
    } else if (achievement.triggerType === 'xp_milestone') {
      const userResult = await query(
        `SELECT total_xp FROM users WHERE id = $1`,
        [childId]
      );
      shouldAward = userResult.rows[0].total_xp >= achievement.triggerValue;
      
    } else if (achievement.triggerType === 'level_milestone') {
      const userResult = await query(
        `SELECT current_level FROM users WHERE id = $1`,
        [childId]
      );
      shouldAward = userResult.rows[0].current_level >= achievement.triggerValue;
      
    } else if (achievement.triggerType === 'streak') {
      const streakResult = await query(
        `SELECT MAX(current_streak) as max_streak FROM activity_streaks WHERE child_id = $1`,
        [childId]
      );
      const maxStreak = streakResult.rows[0].max_streak || 0;
      shouldAward = maxStreak >= achievement.triggerValue;
    }
    
    // Award achievement
    if (shouldAward) {
      await query(
        `INSERT INTO child_achievements (child_id, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [childId, achievement.id]
      );
      
      awardedAchievements.push(achievement);
    }
  }
  
  return awardedAchievements;
}

/**
 * Get achievements for a child
 */
export async function getChildAchievements(childId: number): Promise<ChildAchievementWithDetails[]> {
  const result = await query(
    `SELECT 
       ca.id, ca.child_id as "childId", ca.achievement_id as "achievementId", 
       ca.earned_at as "earnedAt",
       ad.id, ad.family_id as "familyId", ad.name, ad.description, ad.icon, ad.rarity,
       ad.trigger_type as "triggerType", ad.trigger_value as "triggerValue",
       ad.badge_color as "badgeColor", ad.created_at as "createdAt"
     FROM child_achievements ca
     JOIN achievement_definitions ad ON ca.achievement_id = ad.id
     WHERE ca.child_id = $1
     ORDER BY ca.earned_at DESC`,
    [childId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    childId: row.childId,
    achievementId: row.achievementId,
    earnedAt: row.earnedAt,
    achievement: {
      id: row.id,
      familyId: row.familyId,
      name: row.name,
      description: row.description,
      icon: row.icon,
      rarity: row.rarity,
      triggerType: row.triggerType,
      triggerValue: row.triggerValue,
      badgeColor: row.badgeColor,
      createdAt: row.createdAt,
    },
  }));
}

/**
 * Get achievement progress for a child
 */
export async function getAchievementProgress(familyId: number, childId: number) {
  const userResult = await query(
    `SELECT total_xp, current_level FROM users WHERE id = $1`,
    [childId]
  );
  
  const user = userResult.rows[0];
  
  // Get activity completion count
  const activitiesResult = await query(
    `SELECT COUNT(*) as count FROM activity_completions 
     WHERE child_id = $1 AND status = 'approved'`,
    [childId]
  );
  
  const activitiesCompleted = activitiesResult.rows[0].count;
  
  // Get max streak
  const streakResult = await query(
    `SELECT COALESCE(MAX(current_streak), 0) as max_streak 
     FROM activity_streaks WHERE child_id = $1`,
    [childId]
  );
  
  const maxStreak = streakResult.rows[0].max_streak;
  
  // Get all achievements for family
  const achievementsResult = await query(
    `SELECT id, name, trigger_type as "triggerType", trigger_value as "triggerValue", rarity
     FROM achievement_definitions
     WHERE family_id = $1
     ORDER BY trigger_value ASC`,
    [familyId]
  );
  
  // Check which are earned
  const earnedResult = await query(
    `SELECT achievement_id FROM child_achievements WHERE child_id = $1`,
    [childId]
  );
  
  const earnedIds = new Set(earnedResult.rows.map(r => r.achievement_id));
  
  // Calculate progress for each achievement
  const progress = achievementsResult.rows.map(ach => {
    const isEarned = earnedIds.has(ach.id);
    let currentProgress = 0;
    let targetProgress = ach.triggerValue;
    
    if (ach.triggerType === 'xp_milestone') {
      currentProgress = user.total_xp;
    } else if (ach.triggerType === 'level_milestone') {
      currentProgress = user.current_level;
    } else if (ach.triggerType === 'total_activities' || ach.triggerType === 'first_activity') {
      currentProgress = activitiesCompleted;
    } else if (ach.triggerType === 'streak') {
      currentProgress = maxStreak;
    }
    
    return {
      ...ach,
      isEarned,
      currentProgress,
      targetProgress,
      progressPercentage: Math.min(100, (currentProgress / targetProgress) * 100),
    };
  });
  
  return progress;
}

/**
 * Get achievement statistics for family
 */
export async function getAchievementStats(familyId: number) {
  const totalAchievements = await query(
    `SELECT COUNT(*) as count FROM achievement_definitions WHERE family_id = $1`,
    [familyId]
  );
  
  const childrenWithAchievements = await query(
    `SELECT ca.child_id, COUNT(*) as count
     FROM child_achievements ca
     JOIN achievement_definitions ad ON ca.achievement_id = ad.id
     WHERE ad.family_id = $1
     GROUP BY ca.child_id`,
    [familyId]
  );
  
  return {
    totalAchievementsAvailable: totalAchievements.rows[0].count,
    childrenStats: childrenWithAchievements.rows.map(row => ({
      childId: row.child_id,
      achievementsEarned: row.count,
    })),
  };
}
