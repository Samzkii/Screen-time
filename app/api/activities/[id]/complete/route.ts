import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { query } from '@/lib/db';
import { calculateScreenTime } from '@/lib/screen-time';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') ?? undefined);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const activityId = parseInt(id);

    // Get activity
    const activityResult = await query(
      `SELECT * FROM activities WHERE id = $1`,
      [activityId]
    );

    if (activityResult.rows.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const activity = activityResult.rows[0];

    // Verify authorization
    if (decoded.role === 'parent' && activity.parent_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (decoded.role === 'child' && activity.kid_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get kid's current level
    const kidResult = await query(
      `SELECT current_level FROM users WHERE id = $1`,
      [activity.kid_id]
    );

    if (kidResult.rows.length === 0) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    const kidLevel = kidResult.rows[0].current_level;

    // Calculate earned screen time
    const { earnedMinutes, multiplier } = calculateScreenTime(
      activity.duration_minutes,
      kidLevel,
      activity.base_screen_time_minutes
    );

    // Update activity as completed
    await query(
      `UPDATE activities SET completed = true, completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [activityId]
    );

    // Log screen time
    const logResult = await query(
      `INSERT INTO screen_time_logs (kid_id, activity_id, duration_minutes, multiplier, earned_minutes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [activity.kid_id, activityId, activity.duration_minutes, multiplier, earnedMinutes]
    );

    // Update user's total screen time earned
    await query(
      `UPDATE users SET total_screen_time_earned = total_screen_time_earned + $1 WHERE id = $2`,
      [earnedMinutes, activity.kid_id]
    );

    return NextResponse.json(
      {
        activity: { ...activity, completed: true, completed_at: new Date() },
        screenTime: logResult.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Complete activity error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
