import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * JWT Verification Middleware
 * 
 * Usage:
 * 1. Wrap route handlers with verifyAuth()
 * 2. Extract token payload from request
 * 3. Pass to protected endpoints
 * 
 * Example in a protected route:
 * 
 * export async function POST(request: NextRequest) {
 *   const auth = await verifyAuth(request);
 *   if (!auth.success) {
 *     return NextResponse.json({ error: auth.error }, { status: 401 });
 *   }
 *   
 *   const { userId, familyId, role } = auth.payload;
 * }
 */

export interface JWTPayload {
  userId: string;
  familyId: string;
  email: string;
  name: string;
  role: 'parent' | 'child';
}

export async function verifyAuth(request: NextRequest): Promise<
  | { success: true; payload: JWTPayload }
  | { success: false; error: string }
> {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided',
      };
    }

    // Verify JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    return {
      success: true,
      payload: payload as unknown as JWTPayload,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid or expired token',
    };
  }
}

/**
 * Authorization check: Verify user has required role
 */
export function requireRole(allowedRoles: ('parent' | 'child')[]): (payload: JWTPayload) => boolean {
  return (payload: JWTPayload) => allowedRoles.includes(payload.role);
}

/**
 * Authorization check: Verify family access
 * Ensures user can only access their own family's data
 */
export function verifyFamilyAccess(
  requestFamilyId: string,
  userFamilyId: string
): boolean {
  return requestFamilyId === userFamilyId;
}

/**
 * Extract family ID from URL parameters
 * Handles Next.js 16 async params pattern
 */
export async function getFamilyIdFromParams(
  params: Promise<Record<string, string>>
): Promise<string> {
  const resolved = await params;
  return resolved.familyId || '';
}
