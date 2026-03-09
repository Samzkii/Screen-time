import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, verifyFamilyAccess, getFamilyIdFromParams } from '@/lib/auth/middleware';
import { db } from '@/lib/database';
import { approveActivityCompletion } from '@/lib/game/activity-system';

/**
 * POST /api/v1/families/[familyId]/completions/[completionId]/approve
 * 
 * Parent approves or rejects activity completion
 * Triggers: XP award, level up check, achievements check, leaderboard update, notifications
 * 
 * Authorization:
 * - Only parent role can approve/reject
 * - Can only approve for their own family
 * 
 * Request body:
 * {
 *   "approve": true,
 *   "feedback": "Great job! Well done with the dishes."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "completion": {
 *     "id": "uuid",
 *     "status": "approved",
 *     "xpAwarded": 50,
 *     "leveledUp": false,
 *     "newLevel": 2,
 *     "achievementsUnlocked": ["First Steps"]
 *   }
 * }
 */

const ApproveActivitySchema = z.object({
  approve: z.boolean(),
  feedback: z.string().max(500).optional(),
});

type ApproveActivityRequest = z.infer<typeof ApproveActivitySchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string; completionId: string }> }
) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { userId, familyId: userFamilyId, role } = auth.payload;

    // Get params with Next.js 16 async pattern
    const { familyId, completionId: completionIdStr } = await params;
    const completionId = parseInt(completionIdStr);
    const parentId = parseInt(userId);

    // Verify family access
    if (!verifyFamilyAccess(familyId, userFamilyId)) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot access other families' },
        { status: 403 }
      );
    }

    // Verify user is a parent
    if (role !== 'parent') {
      return NextResponse.json(
        { error: 'Only parents can approve activities' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ApproveActivitySchema.parse(body);

    // Fetch completion record
    const completionResult = await db.query(
      `SELECT ac.*, a.name as activity_name, a.difficulty, u.name as child_name
       FROM activity_completions ac
       JOIN activities a ON ac.activity_id = a.id
       JOIN users u ON ac.user_id = u.id
       WHERE ac.id = $1 
       AND a.family_id = $2
       AND ac.status = 'pending'`,
      [completionId, familyId]
    );

    if (completionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Completion not found or already processed' },
        { status: 404 }
      );
    }

    const completion = completionResult.rows[0];
    const childId = completion.user_id;

    let result = {
      id: completionId,
      status: 'rejected' as 'pending' | 'approved' | 'rejected',
      xpAwarded: 0,
      leveledUp: false,
      newLevel: null as number | null,
      achievementsUnlocked: [] as string[],
    };

    if (validatedData.approve) {
      // Approve the activity
      const updatedCompletion = await approveActivityCompletion(
        completionId,
        parentId,
        true,
        validatedData.feedback || undefined
      );

      const userResult = await db.query(
        'SELECT current_level, total_xp FROM users WHERE id = $1',
        [childId]
      );

      const updatedUser = userResult.rows[0];

      result = {
        id: completionId,
        status: 'approved',
        xpAwarded: updatedCompletion?.xpAwarded || 0,
        leveledUp: updatedCompletion?.leveledUp || false,
        newLevel: updatedCompletion?.leveledUp ? updatedUser.current_level : null,
        achievementsUnlocked: updatedCompletion?.newAchievements || [],
      };

      // Create notification for child
      const notificationResult = await db.query(
        `INSERT INTO notifications (
          user_id, type, title, description, related_entity_type, related_entity_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id`,
        [
          childId,
          'activity_approved',
          'Activity Approved!',
          `Your "${completion.activity_name}" submission was approved! You earned ${result.xpAwarded} XP.`,
          'activity',
          completion.activity_id,
        ]
      );

      // If level up, create level-up notification
      if (result.leveledUp) {
        await db.query(
          `INSERT INTO notifications (
            user_id, type, title, description, related_entity_type, related_entity_id, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            childId,
            'level_up',
            '🎉 Level Up!',
            `Congratulations! You reached Level ${result.newLevel}! Your daily screen time increased.`,
            'user',
            childId,
          ]
        );
      }


      // Log audit event
      await db.query(
        `INSERT INTO audit_logs (family_id, user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          familyId,
          userId,
          'ACTIVITY_APPROVED',
          JSON.stringify({
            completionId,
            activityName: completion.activity_name,
            childName: completion.child_name,
            xpAwarded: result.xpAwarded,
            leveledUp: result.leveledUp,
            newLevel: result.newLevel,
          }),
        ]
      );
    } else {
      // Reject the activity
      await approveActivityCompletion(completionId, parentId, false);

      result = {
        id: completionId,
        status: 'rejected',
        xpAwarded: 0,
        leveledUp: false,
        newLevel: null,
        achievementsUnlocked: [],
      };

      // Create notification for child
      await db.query(
        `INSERT INTO notifications (
          user_id, type, title, description, related_entity_type, related_entity_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          childId,
          'activity_rejected',
          'Activity Rejected',
          `Your "${completion.activity_name}" submission was not approved. ${validatedData.feedback ? 'Feedback: ' + validatedData.feedback : 'Please try again.'}`,
          'activity',
          completion.activity_id,
        ]
      );

      // Log audit event
      await db.query(
        `INSERT INTO audit_logs (family_id, user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          familyId,
          userId,
          'ACTIVITY_REJECTED',
          JSON.stringify({
            completionId,
            activityName: completion.activity_name,
            childName: completion.child_name,
            feedback: validatedData.feedback || null,
          }),
        ]
      );
    }

    return NextResponse.json(
      {
        success: true,
        completion: result,
      },
      { status: 200 }
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

    console.error('Activity approval error:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
