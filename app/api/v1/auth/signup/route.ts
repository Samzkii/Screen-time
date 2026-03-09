import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { db } from '@/lib/database';

/**
 * POST /api/v1/auth/signup
 * 
 * Creates a new family with parent account
 * 
 * Request body:
 * {
 *   "email": "parent@example.com",
 *   "password": "secure_password",
 *   "name": "John Doe",
 *   "familyName": "Doe Family"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": { id, email, name, role, familyId, createdAt },
 *   "family": { id, name, totalChildren, createdAt }
 * }
 */

const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  familyName: z.string().min(2, 'Family name must be at least 2 characters'),
});

type SignupRequest = z.infer<typeof SignupSchema>;

async function createJWT(payload: any): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
  return token;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = SignupSchema.parse(body);

    // Check if email already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [validatedData.email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create family
    const familyResult = await db.query(
      `INSERT INTO families (name, created_at)
       VALUES ($1, NOW())
       RETURNING id, name, created_at`,
      [validatedData.familyName]
    );

    const family = familyResult.rows[0];
    const familyId = family.id;

    // Create parent user
    const userResult = await db.query(
      `INSERT INTO users (
        family_id, email, password_hash, name, role, 
        current_level, total_xp, daily_screen_time_limit,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, email, name, role, family_id, created_at`,
      [
        familyId,
        validatedData.email,
        passwordHash,
        validatedData.name,
        'parent', // Role: parent
        1, // Starting level
        0, // Starting XP
        0, // N/A for parents
      ]
    );

    const user = userResult.rows[0];

    // Create JWT token
    const jwtPayload = {
      userId: user.id,
      familyId: user.family_id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createJWT(jwtPayload);

    // Log signup event
    await db.query(
      `INSERT INTO audit_logs (family_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [familyId, user.id, 'USER_CREATED', JSON.stringify({ email: user.email, role: user.role })]
    );

    // Set secure httpOnly cookie
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          familyId: user.family_id,
          createdAt: user.created_at,
        },
        family: {
          id: family.id,
          name: family.name,
          createdAt: family.created_at,
        },
      },
      { status: 201 }
    );

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error instanceof Error) {
      console.error('Signup error:', error.message);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
