// ==========================================
// LEADERBOARD SYSTEM
// ==========================================

import { query } from '@/lib/db';
import { LeaderboardEntryWithChild, LeaderboardType } from '@/lib/types';

/**
 * Initialize default leaderboards for a family
 */
export async function initializeFamilyLeaderboards(familyId: number): Promise<void> {
  const leaderboardTypes: LeaderboardType[] = ['xp', 'activities', 'achievements'];
  const typeNames: Record<LeaderboardType, string> = {
    xp: 'XP Leaderboard',
    activities: 'Activities Leaderboard',
    achievements: 'Achievements Leaderboard',
  };
  
  for (const type of leaderboardTypes) {
    await query(
      `INSERT INTO leaderboards (family_id, name, type, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [familyId, typeNames[type], type, true]
    );
  }
}

/**
 * Update leaderboard entries (should run periodically or after activity completion)
 */
export async function updateLeaderboardEntries(familyId: number, leaderboardType: LeaderboardType): Promise<void> {
  // Get leaderboard
  const leaderboardResult = await query(
    `SELECT id FROM leaderboards WHERE family_id = $1 AND type = $2`,
    [familyId, leaderboardType]
  );
  
  if (leaderboardResult.rows.length === 0) {
    throw new Error('Leaderboard not found');
  }
  
  const leaderboardId = leaderboardResult.rows[0].id;
  
  // Get all children in family
  const childrenResult = await query(
    `SELECT id FROM users WHERE family_id = $1 AND role = 'child'`,
    [familyId]
  );
  
  for (const child of childrenResult.rows) {
    let score = 0;
    
    if (leaderboardType === 'xp') {
      // Get total XP
      const xpResult = await query(
        `SELECT total_xp FROM users WHERE id = $1`,
        [child.id]
      );
      score = xpResult.rows[0].total_xp;
      
    } else if (leaderboardType === 'activities') {
      // Count completed activities
      const activitiesResult = await query(
        `SELECT COUNT(*) as count FROM activity_completions 
         WHERE child_id = $1 AND status = 'approved'`,
        [child.id]
      );
      score = activitiesResult.rows[0].count;
      
    } else if (leaderboardType === 'achievements') {
      // Count earned achievements
      const achievementsResult = await query(
        `SELECT COUNT(*) as count FROM child_achievements WHERE child_id = $1`,
        [child.id]
      );
      score = achievementsResult.rows[0].count;
    }
    
    // Upsert leaderboard entry
    await query(
      `INSERT INTO leaderboard_entries (leaderboard_id, child_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (leaderboard_id, child_id) DO UPDATE
       SET score = $3, updated_at = NOW()`,
      [leaderboardId, child.id, score]
    );
  }
  
  // Update ranks
  await query(
    `UPDATE leaderboard_entries SET rank = ranked.rank
     FROM (
       SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as rank
       FROM leaderboard_entries
       WHERE leaderboard_id = $1
     ) ranked
     WHERE leaderboard_entries.id = ranked.id`,
    [leaderboardId]
  );
}

/**
 * Get leaderboard for a family
 */
export async function getFamilyLeaderboard(
  familyId: number,
  type: LeaderboardType,
  limit: number = 10
): Promise<LeaderboardEntryWithChild[]> {
  const result = await query(
    `SELECT 
       le.id, le.leaderboard_id as "leaderboardId", le.child_id as "childId", 
       le.rank, le.score, le.updated_at as "updatedAt",
       u.id as child_id, u.name as child_name, u.avatar_url as child_avatar
     FROM leaderboard_entries le
     JOIN leaderboards l ON le.leaderboard_id = l.id
     JOIN users u ON le.child_id = u.id
     WHERE l.family_id = $1 AND l.type = $2 AND l.is_active = true
     ORDER BY le.rank ASC
     LIMIT $3`,
    [familyId, type, limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    leaderboardId: row.leaderboardId,
    childId: row.childId,
    rank: row.rank,
    score: row.score,
    updatedAt: row.updatedAt,
    child: {
      id: row.child_id,
      name: row.child_name,
      avatarUrl: row.child_avatar,
    },
  }));
}

/**
 * Get child's rank on a leaderboard
 */
export async function getChildLeaderboardRank(
  familyId: number,
  childId: number,
  type: LeaderboardType
): Promise<number | null> {
  const result = await query(
    `SELECT le.rank
     FROM leaderboard_entries le
     JOIN leaderboards l ON le.leaderboard_id = l.id
     WHERE l.family_id = $1 AND l.type = $2 AND le.child_id = $3 AND l.is_active = true`,
    [familyId, type, childId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0].rank;
}

/**
 * Get cross-family leaderboard
 */
export async function getCrossFamilyLeaderboard(
  leaderboardId: number,
  limit: number = 20
): Promise<LeaderboardEntryWithChild[]> {
  const result = await query(
    `SELECT 
       le.id, le.leaderboard_id as "leaderboardId", le.child_id as "childId", 
       le.rank, le.score, le.updated_at as "updatedAt",
       u.id as child_id, u.name as child_name, u.avatar_url as child_avatar,
       f.id as family_id, f.name as family_name
     FROM leaderboard_entries le
     JOIN leaderboards l ON le.leaderboard_id = l.id
     JOIN users u ON le.child_id = u.id
     JOIN families f ON u.family_id = f.id
     WHERE l.id = $1 AND l.is_active = true
     ORDER BY le.rank ASC
     LIMIT $2`,
    [leaderboardId, limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    leaderboardId: row.leaderboardId,
    childId: row.childId,
    rank: row.rank,
    score: row.score,
    updatedAt: row.updatedAt,
    child: {
      id: row.child_id,
      name: row.child_name,
      avatarUrl: row.child_avatar,
      familyId: row.family_id,
      familyName: row.family_name,
    },
  }));
}

/**
 * Get available cross-family leaderboards (invite only)
 */
export async function getAvailableCrossFamilyLeaderboards(familyId: number) {
  const result = await query(
    `SELECT 
       l.id, l.family_id as "familyId", l.name, l.type, l.is_active as "isActive",
       COUNT(DISTINCT flc.family_id) as connected_families
     FROM leaderboards l
     LEFT JOIN family_leaderboard_connections flc ON l.id = flc.leaderboard_id
     WHERE l.family_id != $1 AND l.is_active = true
     GROUP BY l.id, l.family_id, l.name, l.type, l.is_active
     ORDER BY l.created_at DESC`,
    [familyId]
  );
  
  return result.rows;
}

/**
 * Join a cross-family leaderboard
 */
export async function joinCrossFamilyLeaderboard(
  familyId: number,
  leaderboardId: number
): Promise<void> {
  await query(
    `INSERT INTO family_leaderboard_connections (leaderboard_id, family_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [leaderboardId, familyId]
  );
  
  // Update leaderboard entries for this family
  const leaderResult = await query(
    `SELECT type FROM leaderboards WHERE id = $1`,
    [leaderboardId]
  );
  
  if (leaderResult.rows.length > 0) {
    const leaderboardType = leaderResult.rows[0].type;
    
    // Get all children in family
    const childrenResult = await query(
      `SELECT id FROM users WHERE family_id = $1 AND role = 'child'`,
      [familyId]
    );
    
    for (const child of childrenResult.rows) {
      let score = 0;
      
      if (leaderboardType === 'xp') {
        const xpResult = await query(
          `SELECT total_xp FROM users WHERE id = $1`,
          [child.id]
        );
        score = xpResult.rows[0].total_xp;
      } else if (leaderboardType === 'activities') {
        const activitiesResult = await query(
          `SELECT COUNT(*) as count FROM activity_completions 
           WHERE child_id = $1 AND status = 'approved'`,
          [child.id]
        );
        score = activitiesResult.rows[0].count;
      } else if (leaderboardType === 'achievements') {
        const achievementsResult = await query(
          `SELECT COUNT(*) as count FROM child_achievements WHERE child_id = $1`,
          [child.id]
        );
        score = achievementsResult.rows[0].count;
      }
      
      // Add entry
      await query(
        `INSERT INTO leaderboard_entries (leaderboard_id, child_id, score)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [leaderboardId, child.id, score]
      );
    }
    
    // Recalculate ranks
    await query(
      `UPDATE leaderboard_entries SET rank = ranked.rank
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as rank
         FROM leaderboard_entries
         WHERE leaderboard_id = $1
       ) ranked
       WHERE leaderboard_entries.id = ranked.id`,
      [leaderboardId]
    );
  }
}

/**
 * Leave a cross-family leaderboard
 */
export async function leaveCrossFamilyLeaderboard(
  familyId: number,
  leaderboardId: number
): Promise<void> {
  // Remove family connection
  await query(
    `DELETE FROM family_leaderboard_connections 
     WHERE leaderboard_id = $1 AND family_id = $2`,
    [leaderboardId, familyId]
  );
  
  // Remove entries for this family's children
  await query(
    `DELETE FROM leaderboard_entries
     WHERE leaderboard_id = $1 AND child_id IN (
       SELECT id FROM users WHERE family_id = $2
     )`,
    [leaderboardId, familyId]
  );
  
  // Recalculate ranks
  await query(
    `UPDATE leaderboard_entries SET rank = ranked.rank
     FROM (
       SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as rank
       FROM leaderboard_entries
       WHERE leaderboard_id = $1
     ) ranked
     WHERE leaderboard_entries.id = ranked.id`,
    [leaderboardId]
  );
}

/**
 * Get leaderboard statistics
 */
export async function getLeaderboardStats(leaderboardId: number) {
  const result = await query(
    `SELECT 
       COUNT(*) as total_entries,
       AVG(score) as average_score,
       MAX(score) as highest_score,
       MIN(score) as lowest_score,
       STDDEV(score) as score_stddev
     FROM leaderboard_entries
     WHERE leaderboard_id = $1`,
    [leaderboardId]
  );
  
  return result.rows[0];
}
