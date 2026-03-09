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
    const choreId = parseInt(id);

    // Get chore
    const choreResult = await query(
      `SELECT * FROM chores WHERE id = $1`,
      [choreId]
    );

    if (choreResult.rows.length === 0) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    const chore = choreResult.rows[0];

    // Verify authorization: parents can complete chores for any child in their family,
    // children can only complete their own chores.
    if (decoded.role === 'parent') {
      const parentResult = await query(
        `SELECT family_id FROM users WHERE id = $1 AND role = 'parent'`,
        [decoded.userId]
      );

      if (parentResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Parent account not found' },
          { status: 404 }
        );
      }

      const familyId = parentResult.rows[0].family_id as number;

      const kidResult = await query(
        `SELECT id FROM users WHERE id = $1 AND family_id = $2 AND role = 'child'`,
        [chore.kid_id, familyId]
      );

      if (kidResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    } else if (decoded.role === 'child' && chore.kid_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get kid's current level
    const kidResult = await query(
      `SELECT current_level FROM users WHERE id = $1`,
      [chore.kid_id]
    );

    if (kidResult.rows.length === 0) {
      return NextResponse.json({ error: 'Kid not found' }, { status: 404 });
    }

    const kidLevel = kidResult.rows[0].current_level;

    // Calculate earned screen time
    const { earnedMinutes, multiplier } = calculateScreenTime(
      chore.duration_minutes,
      kidLevel,
      chore.base_screen_time_minutes
    );

    // Update chore as completed
    await query(
      `UPDATE chores SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [choreId]
    );

    // NOTE: The legacy implementation wrote to a screen_time_logs table and
    // updated total_screen_time_earned directly on users. The current schema
    // models screen time differently, so for now we only mark the chore as
    // completed and return the calculated values to the client.

    return NextResponse.json(
      {
        chore: { ...chore, status: 'completed', completed_at: new Date().toISOString() },
        screenTime: {
          kid_id: chore.kid_id,
          chore_id: choreId,
          duration_minutes: chore.duration_minutes,
          multiplier,
          earned_minutes: earnedMinutes,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Complete chore error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
