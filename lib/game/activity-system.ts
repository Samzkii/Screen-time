// ==========================================
// ACTIVITY SYSTEM & STREAK TRACKING
// ==========================================

import { query } from '@/lib/db';
import { ActivityCompletion, ActivityCompletionStatus } from '@/lib/types';
import { awardXpForActivity, checkAndAwardAchievements } from './xp-system';
import { updateLeaderboardEntries } from './leaderboard-system';

/**
 * Submit an activity for approval
 */
export async function submitActivityCompletion(
  familyId: number,
  activityId: number,
  childId: number,
  notes?: string,
  photoUrl?: string
): Promise<ActivityCompletion> {
  
  // Get activity details
  const activityResult = await query(
    `SELECT xp_reward, difficulty FROM activities WHERE id = $1`,
    [activityId]
  );
  
  if (activityResult.rows.length === 0) {
    throw new Error('Activity not found');
  }
  
  // Check if already pending/approved today (for daily activities)
  const existingResult = await query(
    `SELECT id FROM activity_completions 
     WHERE activity_id = $1 AND child_id = $2 AND status != 'rejected'
     AND DATE(submitted_at) = CURRENT_DATE`,
    [activityId, childId]
  );
  
  if (existingResult.rows.length > 0) {
    throw new Error('Activity already submitted today');
  }
  
  // Create submission
  const result = await query(
    `INSERT INTO activity_completions 
     (family_id, activity_id, child_id, notes, photo_url, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id, family_id as "familyId", activity_id as "activityId", 
               child_id as "childId", status, notes, photo_url as "photoUrl",
               submitted_at as "submittedAt", approved_by as "approvedBy",
               approved_at as "approvedAt", xp_awarded as "xpAwarded",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [familyId, activityId, childId, notes || null, photoUrl || null]
  );
  
  const completion = result.rows[0];
  
  // Create notification for parents
  const parentsResult = await query(
    `SELECT id FROM users WHERE family_id = $1 AND role = 'parent'`,
    [familyId]
  );
  
  const childResult = await query(
    `SELECT name FROM users WHERE id = $1`,
    [childId]
  );
  
  const activityNameResult = await query(
    `SELECT name FROM activities WHERE id = $1`,
    [activityId]
  );
  
  const childName = childResult.rows[0].name;
  const activityName = activityNameResult.rows[0].name;
  
  for (const parent of parentsResult.rows) {
    await query(
      `INSERT INTO notifications 
       (family_id, user_id, type, title, message)
       VALUES ($1, $2, 'activity_submitted', $3, $4)`,
      [
        familyId,
        parent.id,
        `${childName} completed ${activityName}`,
        `${childName} submitted "${activityName}" for approval`,
      ]
    );
  }
  
  return completion;
}

/**
 * Approve or reject an activity completion
 */
export async function approveActivityCompletion(
  completionId: number,
  parentId: number,
  approve: boolean,
  reason?: string
): Promise<{ xpAwarded?: number; leveledUp?: boolean; newLevel?: number; newAchievements?: string[] } | void> {
  
  // Get completion details
  const completionResult = await query(
    `SELECT family_id, activity_id, child_id, status FROM activity_completions WHERE id = $1`,
    [completionId]
  );
  
  if (completionResult.rows.length === 0) {
    throw new Error('Completion not found');
  }
  
  const completion = completionResult.rows[0];
  
  if (completion.status !== 'pending') {
    throw new Error('This completion has already been processed');
  }
  
  if (approve) {
    // Get activity details
    const activityResult = await query(
      `SELECT xp_reward, difficulty FROM activities WHERE id = $1`,
      [completion.activity_id]
    );
    
    const activity = activityResult.rows[0];
    
    // Award XP
    const { xpAwarded, leveledUp, newLevel } = await awardXpForActivity(
      completion.family_id,
      completion.child_id,
      activity.xp_reward,
      activity.difficulty,
      completionId,
      parentId
    );
    
    // Update completion status
    await query(
      `UPDATE activity_completions 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), xp_awarded = $2, updated_at = NOW()
       WHERE id = $3`,
      [parentId, xpAwarded, completionId]
    );
    
    // Update streak
    await updateActivityStreak(completion.child_id, completion.activity_id);
    
    // Check for achievements
    const newAchievements = await checkAndAwardAchievements(completion.family_id, completion.child_id);
    
    // Update leaderboards
    await updateLeaderboardEntries(completion.family_id, 'xp');
    await updateLeaderboardEntries(completion.family_id, 'activities');
    if (newAchievements.length > 0) {
      await updateLeaderboardEntries(completion.family_id, 'achievements');
    }
    
    // Notify child
    const activityNameResult = await query(
      `SELECT name FROM activities WHERE id = $1`,
      [completion.activity_id]
    );
    
    const activityName = activityNameResult.rows[0].name;
    
    await query(
      `INSERT INTO notifications 
       (family_id, user_id, type, title, message)
       VALUES ($1, $2, 'activity_approved', $3, $4)`,
      [
        completion.family_id,
        completion.child_id,
        `Approved: ${activityName}`,
        `Great job! You earned ${xpAwarded} XP for completing "${activityName}"${leveledUp ? ` and leveled up to level ${newLevel}!` : ''}`,
      ]
    );
    
    // Notify for achievements
    for (const achievement of newAchievements) {
      await query(
        `INSERT INTO notifications 
         (family_id, user_id, type, title, message)
         VALUES ($1, $2, 'achievement_earned', $3, $4)`,
        [
          completion.family_id,
          completion.child_id,
          `Achievement Unlocked: ${achievement.name}`,
          achievement.description,
        ]
      );
    }
    
    return { xpAwarded, leveledUp, newLevel, newAchievements };
  } else {
    // Reject
    await query(
      `UPDATE activity_completions 
       SET status = 'rejected', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [parentId, completionId]
    );
    
    // Notify child
    const activityNameResult = await query(
      `SELECT name FROM activities WHERE id = $1`,
      [completion.activity_id]
    );
    
    const activityName = activityNameResult.rows[0].name;
    const reasonText = reason ? ` Reason: ${reason}` : '';
    
    await query(
      `INSERT INTO notifications 
       (family_id, user_id, type, title, message)
       VALUES ($1, $2, 'activity_rejected', $3, $4)`,
      [
        completion.family_id,
        completion.child_id,
        `Not Approved: ${activityName}`,
        `Your completion of "${activityName}" was not approved.${reasonText}`,
      ]
    );
  }
}

/**
 * Update streak for an activity
 */
export async function updateActivityStreak(childId: number, activityId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get current streak
  const streakResult = await query(
    `SELECT current_streak, longest_streak, last_completed_date FROM activity_streaks 
     WHERE child_id = $1 AND activity_id = $2`,
    [childId, activityId]
  );
  
  let currentStreak = 1;
  let longestStreak = 1;
  
  if (streakResult.rows.length > 0) {
    const streak = streakResult.rows[0];
    const lastDate = new Date(streak.last_completed_date);
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    
    // Check if completed yesterday (consecutive)
    if (
      lastDate.getFullYear() === yesterdayDate.getFullYear() &&
      lastDate.getMonth() === yesterdayDate.getMonth() &&
      lastDate.getDate() === yesterdayDate.getDate()
    ) {
      currentStreak = streak.current_streak + 1;
    }
    // If not yesterday, reset streak
    else if (lastDate.toISOString().split('T')[0] !== today) {
      currentStreak = 1;
    }
    // If already completed today, don't change count
    else {
      currentStreak = streak.current_streak;
    }
    
    longestStreak = Math.max(currentStreak, streak.longest_streak);
  }
  
  // Upsert streak
  await query(
    `INSERT INTO activity_streaks (child_id, activity_id, current_streak, longest_streak, last_completed_date)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (child_id, activity_id) DO UPDATE 
     SET current_streak = $3, longest_streak = $4, last_completed_date = $5, updated_at = NOW()`,
    [childId, activityId, currentStreak, longestStreak, today]
  );
}

/**
 * Get pending completions for a family
 */
export async function getPendingCompletions(familyId: number) {
  const result = await query(
    `SELECT 
       ac.id, ac.family_id as "familyId", ac.activity_id as "activityId",
       ac.child_id as "childId", ac.status, ac.notes, ac.photo_url as "photoUrl",
       ac.submitted_at as "submittedAt", ac.approved_by as "approvedBy",
       ac.approved_at as "approvedAt", ac.xp_awarded as "xpAwarded",
       ac.created_at as "createdAt", ac.updated_at as "updatedAt",
       a.name as activity_name, a.difficulty, a.xp_reward,
       u.name as child_name, u.id as child_id
     FROM activity_completions ac
     JOIN activities a ON ac.activity_id = a.id
     JOIN users u ON ac.child_id = u.id
     WHERE ac.family_id = $1 AND ac.status = 'pending'
     ORDER BY ac.submitted_at ASC`,
    [familyId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    familyId: row.familyId,
    activityId: row.activityId,
    childId: row.childId,
    status: row.status,
    notes: row.notes,
    photoUrl: row.photoUrl,
    submittedAt: row.submittedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    xpAwarded: row.xpAwarded,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    activity: {
      name: row.activity_name,
      difficulty: row.difficulty,
      xpReward: row.xp_reward,
    },
    child: {
      id: row.child_id,
      name: row.child_name,
    },
  }));
}

/**
 * Get activity history for a child
 */
export async function getActivityHistory(childId: number, limit: number = 20) {
  const result = await query(
    `SELECT 
       ac.id, ac.activity_id, ac.status, ac.xp_awarded as "xpAwarded",
       ac.submitted_at as "submittedAt", ac.approved_at as "approvedAt",
       a.name as activity_name, a.difficulty, a.xp_reward
     FROM activity_completions ac
     JOIN activities a ON ac.activity_id = a.id
     WHERE ac.child_id = $1
     ORDER BY ac.submitted_at DESC
     LIMIT $2`,
    [childId, limit]
  );
  
  return result.rows;
}

/**
 * Get available activities for a child
 */
export async function getAvailableActivitiesForChild(familyId: number, childId: number) {
  const result = await query(
    `SELECT 
       a.id, a.name, a.description, a.type, a.difficulty, a.xp_reward,
       ac.id as category_id, ac.name as category_name
     FROM activities a
     LEFT JOIN activity_categories ac ON a.category_id = ac.id
     WHERE a.family_id = $1 AND a.is_active = true
     AND (
       NOT EXISTS (
         SELECT 1 FROM activity_assignments WHERE activity_id = a.id
       )
       OR EXISTS (
         SELECT 1 FROM activity_assignments 
         WHERE activity_id = a.id AND child_id = $2
       )
     )
     ORDER BY a.created_at DESC`,
    [familyId, childId]
  );
  
  return result.rows;
}
