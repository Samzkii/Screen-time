import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyFamilyAccess, getFamilyIdFromParams } from '@/lib/auth/middleware';
import { db } from '@/lib/database';

/**
 * GET /api/v1/families/[familyId]/dashboard
 * 
 * Fetch family dashboard data for authenticated user
 * 
 * Authorization:
 * - Parent can view their family's dashboard
 * - Child can view their family's dashboard
 * 
 * Response:
 * {
 *   "family": { id, name, totalChildren, totalParents },
 *   "children": [
 *     { id, name, currentLevel, totalXp, dailyScreenTimeLimit, weeklyScreenTimeUsed }
 *   ],
 *   "recentActivities": [
 *     { id, childId, activityId, activityName, completedAt, xpAwarded, status }
 *   ],
 *   "leaderboards": {
 *     "xp": [ { rank, childId, childName, totalXp } ],
 *     "activities": [ { rank, childId, childName, totalActivities } ]
 *   }
 * }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { userId, familyId: userFamilyId, role } = auth.payload;

    // Get family ID from URL parameters (Next.js 16 async pattern)
    const { familyId } = await params;

    // Verify family access
    if (!verifyFamilyAccess(familyId, userFamilyId)) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot access other families' },
        { status: 403 }
      );
    }

    // Fetch family data
    const familyResult = await db.query(
      'SELECT id, name FROM families WHERE id = $1',
      [familyId]
    );

    if (familyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Family not found' },
        { status: 404 }
      );
    }

    const family = familyResult.rows[0];

    // Fetch family members
    const membersResult = await db.query(
      `SELECT id, name, role, current_level, total_xp, 
              daily_screen_time_limit, weekly_screen_time_used
       FROM users
       WHERE family_id = $1
       ORDER BY role DESC, name ASC`,
      [familyId]
    );

    const members = membersResult.rows;
    const children = members.filter((m: any) => m.role === 'child');
    const parentCount = members.filter((m: any) => m.role === 'parent').length;

    // Fetch recent activities
    const activitiesResult = await db.query(
      `SELECT ac.id, ac.user_id as childId, a.name as activityName, 
              a.difficulty, ac.created_at as completedAt, 
              ac.xp_awarded as xpAwarded, ac.status
       FROM activity_completions ac
       JOIN activities a ON ac.activity_id = a.id
       JOIN users u ON ac.user_id = u.id
       WHERE u.family_id = $1
       ORDER BY ac.created_at DESC
       LIMIT 10`,
      [familyId]
    );

    const recentActivities = activitiesResult.rows;

    // Fetch XP leaderboard
    const xpLeaderboardResult = await db.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank,
              id, name, total_xp, current_level
       FROM users
       WHERE family_id = $1 AND role = 'child'
       ORDER BY total_xp DESC`,
      [familyId]
    );

    const xpLeaderboard = xpLeaderboardResult.rows;

    // Fetch activities count leaderboard
    const activitiesLeaderboardResult = await db.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY activity_count DESC) as rank,
              u.id, u.name, COUNT(ac.id) as activity_count
       FROM users u
       LEFT JOIN activity_completions ac ON u.id = ac.user_id AND ac.status = 'approved'
       WHERE u.family_id = $1 AND u.role = 'child'
       GROUP BY u.id, u.name
       ORDER BY activity_count DESC`,
      [familyId]
    );

    const activitiesLeaderboard = activitiesLeaderboardResult.rows;

    // Build response
    const response = {
      family: {
        id: family.id,
        name: family.name,
        totalChildren: children.length,
        totalParents: parentCount,
      },
      children: children.map((child: any) => ({
        id: child.id,
        name: child.name,
        currentLevel: child.current_level,
        totalXp: child.total_xp,
        dailyScreenTimeLimit: child.daily_screen_time_limit,
        weeklyScreenTimeUsed: child.weekly_screen_time_used,
      })),
      recentActivities: recentActivities.map((ac: any) => ({
        id: ac.id,
        childId: ac.childId,
        activityName: ac.activityName,
        difficulty: ac.difficulty,
        completedAt: ac.completedAt,
        xpAwarded: ac.xpAwarded,
        status: ac.status,
      })),
      leaderboards: {
        xp: xpLeaderboard.map((entry: any) => ({
          rank: entry.rank,
          childId: entry.id,
          childName: entry.name,
          totalXp: entry.total_xp,
          currentLevel: entry.current_level,
        })),
        activities: activitiesLeaderboard.map((entry: any) => ({
          rank: entry.rank,
          childId: entry.id,
          childName: entry.name,
          totalActivities: entry.activity_count || 0,
        })),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
