// ==========================================
// SCREEN TIME SYSTEM
// ==========================================

import { query } from '@/lib/db';
import { ScreenTimeStatus } from '@/lib/types';

/**
 * Get the current week's Monday (start of week)
 */
export function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get current screen time status for a child
 */
export async function getScreenTimeStatus(childId: number): Promise<ScreenTimeStatus> {
  // Get user level and screen time limit
  const userResult = await query(
    `SELECT id, family_id as "familyId", current_level, daily_screen_time_limit
     FROM users WHERE id = $1`,
    [childId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const user = userResult.rows[0];
  const weekStart = getWeekStartDate();
  
  // Get screen time used this week
  const screenTimeResult = await query(
    `SELECT COALESCE(SUM(duration_minutes), 0) as total_used
     FROM screen_time_sessions
     WHERE child_id = $1 AND started_at >= $2`,
    [childId, weekStart.toISOString()]
  );
  
  const weeklyUsed = screenTimeResult.rows[0].total_used;
  
  // Calculate weekly allowance (7 days * daily limit)
  const weeklyLimit = user.daily_screen_time_limit * 7;
  const weeklyRemaining = Math.max(0, weeklyLimit - weeklyUsed);
  const percentageUsed = (weeklyUsed / weeklyLimit) * 100;
  
  // Next reset date (next Monday)
  const nextReset = new Date(weekStart);
  nextReset.setDate(nextReset.getDate() + 7);
  
  return {
    childId,
    dailyLimit: user.daily_screen_time_limit,
    weeklyUsed,
    weeklyRemaining,
    percentageUsed: Math.min(percentageUsed, 100),
    resetDate: nextReset.toISOString().split('T')[0],
  };
}

/**
 * Log a screen time session
 */
export async function logScreenTimeSession(
  familyId: number,
  childId: number,
  durationMinutes: number,
  deviceType?: string
): Promise<void> {
  // Check if screen time would exceed weekly allowance
  const status = await getScreenTimeStatus(childId);
  
  if (durationMinutes > status.weeklyRemaining) {
    throw new Error('Insufficient screen time available');
  }
  
  // Log session
  await query(
    `INSERT INTO screen_time_sessions (family_id, child_id, device_type, duration_minutes, started_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [familyId, childId, deviceType || null, durationMinutes]
  );
  
  // Update weekly usage
  await query(
    `UPDATE users SET weekly_screen_time_used = weekly_screen_time_used + $1
     WHERE id = $2`,
    [durationMinutes, childId]
  );
}

/**
 * End a screen time session
 */
export async function endScreenTimeSession(sessionId: number): Promise<void> {
  await query(
    `UPDATE screen_time_sessions SET ended_at = NOW() WHERE id = $1`,
    [sessionId]
  );
}

/**
 * Reset weekly screen time usage (called weekly, e.g., via cron job)
 */
export async function resetWeeklyScreenTime(familyId: number): Promise<void> {
  const weekStart = getWeekStartDate();
  
  // Get all children in family
  const childrenResult = await query(
    `SELECT id FROM users WHERE family_id = $1 AND role = 'child'`,
    [familyId]
  );
  
  for (const child of childrenResult.rows) {
    // Log the reset
    await query(
      `INSERT INTO screen_time_reset_log (family_id, child_id, week_start_date, screen_time_used)
       SELECT $1, id, $2, weekly_screen_time_used
       FROM users WHERE id = $3`,
      [familyId, weekStart.toISOString().split('T')[0], child.id]
    );
    
    // Reset the counter
    await query(
      `UPDATE users SET weekly_screen_time_used = 0 WHERE id = $1`,
      [child.id]
    );
  }
}

/**
 * Check if screen time should block device access
 */
export async function shouldBlockScreenTime(childId: number): Promise<boolean> {
  const status = await getScreenTimeStatus(childId);
  return status.weeklyRemaining <= 0;
}

/**
 * Get screen time history
 */
export async function getScreenTimeHistory(childId: number, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await query(
    `SELECT id, device_type as "deviceType", duration_minutes as "durationMinutes", 
            started_at as "startedAt", ended_at as "endedAt", created_at as "createdAt"
     FROM screen_time_sessions
     WHERE child_id = $1 AND started_at >= $2
     ORDER BY started_at DESC`,
    [childId, startDate.toISOString()]
  );
  
  return result.rows;
}

/**
 * Get weekly screen time analytics for a child
 */
export async function getWeeklyScreenTimeAnalytics(childId: number) {
  const weekStart = getWeekStartDate();
  
  // Get daily breakdown
  const result = await query(
    `SELECT 
       DATE(started_at) as date,
       COALESCE(SUM(duration_minutes), 0) as total_minutes,
       COUNT(*) as session_count,
       COALESCE(AVG(duration_minutes), 0) as avg_duration
     FROM screen_time_sessions
     WHERE child_id = $1 AND started_at >= $2
     GROUP BY DATE(started_at)
     ORDER BY date`,
    [childId, weekStart.toISOString()]
  );
  
  return result.rows.map(row => ({
    date: row.date,
    totalMinutes: row.total_minutes,
    sessionCount: row.session_count,
    avgDuration: row.avg_duration,
  }));
}

/**
 * Get device-specific screen time breakdown
 */
export async function getScreenTimeByDevice(childId: number, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await query(
    `SELECT 
       device_type as "deviceType",
       COUNT(*) as session_count,
       COALESCE(SUM(duration_minutes), 0) as total_minutes
     FROM screen_time_sessions
     WHERE child_id = $1 AND started_at >= $2
     GROUP BY device_type
     ORDER BY total_minutes DESC`,
    [childId, startDate.toISOString()]
  );
  
  return result.rows;
}
