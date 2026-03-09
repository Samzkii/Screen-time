import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') ?? undefined);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'parent') {
      return NextResponse.json(
        { error: 'Only parents can create activities' },
        { status: 403 }
      );
    }

    const { kidId, title, description, durationMinutes, activityType } = await request.json();

    if (!kidId || !title || !durationMinutes || !activityType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify kid belongs to this parent
    const kidResult = await query(
      `SELECT id FROM users WHERE id = $1 AND parent_id = $2`,
      [kidId, decoded.userId]
    );

    if (kidResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Kid not found' },
        { status: 404 }
      );
    }

    // Base screen time: 15 min activity = 20 min screen time (at level 1: 1x multiplier)
    const baseScreenTimeMinutes = Math.floor((durationMinutes / 15) * 20);

    const result = await query(
      `INSERT INTO activities (kid_id, parent_id, title, description, duration_minutes, base_screen_time_minutes, activity_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [kidId, decoded.userId, title, description || null, durationMinutes, baseScreenTimeMinutes, activityType]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create activity error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') ?? undefined);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let result;

    if (decoded.role === 'parent') {
      // Parents see their kids' activities
      result = await query(
        `SELECT * FROM activities WHERE parent_id = $1 ORDER BY created_at DESC`,
        [decoded.userId]
      );
    } else {
      // Kids see their own activities
      result = await query(
        `SELECT * FROM activities WHERE kid_id = $1 ORDER BY created_at DESC`,
        [decoded.userId]
      );
    }

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error('Get activities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
