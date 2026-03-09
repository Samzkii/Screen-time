import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie') ?? undefined);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== 'parent') {
      return NextResponse.json(
        { error: 'Only parents can view their kids' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT id, email, name, current_level, total_xp, daily_screen_time_limit, weekly_screen_time_used, created_at 
       FROM users WHERE family_id = $1 AND role = 'child' ORDER BY name`,
      [decoded.familyId]
    );

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error('Get kids error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
