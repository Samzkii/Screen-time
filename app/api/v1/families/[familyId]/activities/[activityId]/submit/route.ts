import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, verifyFamilyAccess, getFamilyIdFromParams } from '@/lib/auth/middleware';
import { db } from '@/lib/database';
import { submitActivityCompletion } from '@/lib/game/activity-system';

/**
 * POST /api/v1/families/[familyId]/activities/[activityId]/submit
 * 
 * Child submits activity completion for parent approval
 * 
 * Authorization:
 * - Only child role can submit
 * - Can only submit for their own family
 * 
 * Request body:
 * {
 *   "notes": "I helped mom with dishes",
 *   "photoUrl": "https://..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "completion": { id, activityId, childId, status, createdAt }
 * }
 */

const SubmitActivitySchema = z.object({
  notes: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
});

type SubmitActivityRequest = z.infer<typeof SubmitActivitySchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; activityId: string }> }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { userId, familyId: userFamilyId, role } = auth.payload;

    // Get family ID and activity ID from URL
    const { familyId: familyIdStr, activityId: activityIdStr } = await params;
    const familyId = parseInt(familyIdStr);
    const activityId = parseInt(activityIdStr);
    const childId = parseInt(userId);

    // Verify family access
    if (!verifyFamilyAccess(familyIdStr, userFamilyId)) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot access other families' },
        { status: 403 }
      );
    }

    // Verify user is a child
    if (role !== 'child') {
      return NextResponse.json(
        { error: 'Only children can submit activities' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = SubmitActivitySchema.parse(body);

    // Verify activity exists and belongs to this family
    const activityResult = await db.query(
      `SELECT id, name, family_id, activity_type
       FROM activities
       WHERE id = $1 AND family_id = $2`,
      [activityId, familyId]
    );

    if (activityResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    const activity = activityResult.rows[0];

    // Check for duplicate submission (for daily activities)
    if (activity.activity_type === 'daily') {
      const todaySubmissionResult = await db.query(
        `SELECT id FROM activity_completions
         WHERE activity_id = $1 
         AND user_id = $2 
         AND DATE(created_at) = CURRENT_DATE
         AND status != 'rejected'`,
        [activityId, userId]
      );

      if (todaySubmissionResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'You have already submitted this activity today' },
          { status: 400 }
        );
      }
    }

    // Submit activity completion using game system
    const completion = await submitActivityCompletion(
      familyId,
      activityId,
      childId,
      validatedData.notes || undefined,
      validatedData.photoUrl || undefined
    );

    // Log audit event
    await db.query(
      `INSERT INTO audit_logs (family_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        familyId,
        userId,
        'ACTIVITY_SUBMITTED',
        JSON.stringify({
          activityId,
          activityName: activity.name,
          completionId: completion.id,
        }),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        completion: {
          id: completion.id,
          activityId: completion.activityId,
          childId: completion.childId,
          status: completion.status,
          createdAt: completion.submittedAt,
        },
      },
      { status: 201 }
    );
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

    console.error('Activity submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit activity' },
      { status: 500 }
    );
  }
}
