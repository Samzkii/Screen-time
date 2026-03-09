import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { query } from '@/lib/db';
import { calculateScreenTime } from '@/lib/screen-time';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') ?? undefined);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'parent') {
      return NextResponse.json(
        { error: 'Only parents can create chores' },
        { status: 403 }
      );
    }

    const { kidId, title, description, durationMinutes } = await request.json();

    if (!kidId || !title || !durationMinutes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Load parent family_id
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

    // Verify kid belongs to this family and is a child
    const kidResult = await query(
      `SELECT id FROM users WHERE id = $1 AND family_id = $2 AND role = 'child'`,
      [kidId, familyId]
    );

    if (kidResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Child not found in your family' },
        { status: 404 }
      );
    }

    // Base screen time: 15 min chore = 20 min screen time (at level 1: 1x multiplier)
    const baseScreenTimeMinutes = Math.floor((durationMinutes / 15) * 20);

    const result = await query(
      `INSERT INTO chores (family_id, kid_id, created_by, title, description, duration_minutes, base_screen_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [familyId, kidId, decoded.userId, title, description || null, durationMinutes, baseScreenTimeMinutes]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create chore error:', error);
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

    if (decoded.role === 'parent') {
      // Parents see chores for all children in their family
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

      const kidsResult = await query(
        `SELECT id FROM users WHERE family_id = $1 AND role = 'child'`,
        [familyId]
      );

      if (kidsResult.rows.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      const kidIds = kidsResult.rows.map((row) => row.id);

      const choresResult = await query(
        `SELECT * FROM chores WHERE kid_id = ANY($1::int[]) ORDER BY created_at DESC`,
        [kidIds]
      );

      return NextResponse.json(choresResult.rows, { status: 200 });
    }

    // Kids see their own chores
    const choresResult = await query(
      `SELECT * FROM chores WHERE kid_id = $1 ORDER BY created_at DESC`,
      [decoded.userId]
    );

    return NextResponse.json(choresResult.rows, { status: 200 });
  } catch (error) {
    console.error('Get chores error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
