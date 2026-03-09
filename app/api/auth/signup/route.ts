import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { query } from '@/lib/db';
import { createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      name,
      role: rawRole,
      familyId: bodyFamilyId,
    } = await request.json();

    // Normalize role to align with database values
    const role = rawRole === 'kid' ? 'child' : rawRole;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If registering a child, familyId must be provided
    let familyId: number | null = null;
    if (role === 'child') {
      if (!bodyFamilyId) {
        return NextResponse.json(
          { error: 'Family ID required for child signup' },
          { status: 400 }
        );
      }
      familyId = parseInt(bodyFamilyId, 10);
    }

    if (role !== 'parent' && role !== 'child') {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // If signing up as parent create a new family
    if (role === 'parent') {
      const familyResult = await query(
        `INSERT INTO families (name, created_by)
         VALUES ($1, NULL)
         RETURNING id`,
        [name || email]
      );
      familyId = familyResult.rows[0].id;
    }

    // Insert user, include family_id when available
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role, family_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, family_id, email, name, role, current_level`,
      [email, hashedPassword, name, role, familyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const user = result.rows[0];

    // if family was created, update created_by field now that we have user id
    if (familyId) {
      await query(`UPDATE families SET created_by = $1 WHERE id = $2`, [
        user.id,
        familyId,
      ]);
    }

    const token = createToken({
      userId: user.id,
      familyId: user.family_id || familyId || 0,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          level: user.current_level,
        },
      },
      { status: 201 }
    );

    response.cookies.set('auth', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    
    // Check if it's a unique constraint error
    if (error instanceof Error && error.message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
