import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { db } from '@/lib/database';

/**
 * POST /api/v1/auth/login
 * 
 * Authenticates user and returns JWT token
 * 
 * Request body:
 * {
 *   "email": "parent@example.com",
 *   "password": "secure_password"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": { id, email, name, role, familyId, currentLevel, totalXp },
 *   "family": { id, name }
 * }
 */

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginRequest = z.infer<typeof LoginSchema>;

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
    const validatedData = LoginSchema.parse(body);

    // Find user by email
    const userResult = await db.query(
      `SELECT u.*, f.name as family_name
       FROM users u
       JOIN families f ON u.family_id = f.id
       WHERE u.email = $1`,
      [validatedData.email]
    );

    const user = userResult.rows[0];

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(
      validatedData.password,
      user.password_hash
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const jwtPayload = {
      userId: user.id,
      familyId: user.family_id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createJWT(jwtPayload);

    // Log login event
    await db.query(
      `INSERT INTO audit_logs (family_id, user_id, action, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [user.family_id, user.id, 'USER_LOGIN']
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
          currentLevel: user.current_level,
          totalXp: user.total_xp,
          dailyScreenTimeLimit: user.daily_screen_time_limit,
        },
        family: {
          id: user.family_id,
          name: user.family_name,
        },
      },
      { status: 200 }
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
      console.error('Login error:', error.message);
      return NextResponse.json(
        { error: 'Failed to authenticate' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
