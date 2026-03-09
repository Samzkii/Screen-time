// ==========================================
// API ROUTES DESIGN & ARCHITECTURE
// Comprehensive Route Map for Screentime App
// ==========================================

/*
BASE URL: /api/v1

Authentication & User Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /auth/register
  Body: { email, password, name, role: 'parent'|'child' }
  Response: { user, token }
  
POST /auth/login
  Body: { email, password }
  Response: { user, token }
  
POST /auth/logout
  Response: { success: true }
  
POST /auth/refresh-token
  Body: { refreshToken }
  Response: { token }
  
GET /auth/me
  Response: { user }

User Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /users/:userId
  Response: { user }
  
PATCH /users/:userId
  Body: { name?, avatarUrl?, dateOfBirth? }
  Response: { user }
  
DELETE /users/:userId
  Response: { success: true }


Family Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /families
  Body: { name }
  Response: { family, inviteToken }
  
GET /families/:familyId
  Response: { family, members: User[] }
  
PATCH /families/:familyId
  Body: { name? }
  Response: { family }
  
DELETE /families/:familyId
  Response: { success: true }
  
POST /families/:familyId/invite
  Body: { email }
  Response: { inviteToken, inviteUrl }
  
POST /families/:familyId/accept-invite
  Body: { inviteToken }
  Response: { family, user }
  
GET /families/:familyId/members
  Response: { members: FamilyMember[] }
  
DELETE /families/:familyId/members/:userId
  Response: { success: true }


Activity Management
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/activities
  Query: { type?, categoryId?, isActive? }
  Response: { activities: Activity[] }
  
POST /families/:familyId/activities
  Body: { name, description?, categoryId?, type, difficulty, xpReward }
  Response: { activity }
  
GET /families/:familyId/activities/:activityId
  Response: { activity }
  
PATCH /families/:familyId/activities/:activityId
  Body: { name?, description?, difficulty?, xpReward?, isActive? }
  Response: { activity }
  
DELETE /families/:familyId/activities/:activityId
  Response: { success: true }

Activity Categories
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/categories
  Response: { categories: ActivityCategory[] }
  
POST /families/:familyId/categories
  Body: { name, icon?, color? }
  Response: { category }
  
PATCH /families/:familyId/categories/:categoryId
  Body: { name?, icon?, color? }
  Response: { category }
  
DELETE /families/:familyId/categories/:categoryId
  Response: { success: true }

Activity Assignments
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /families/:familyId/activities/:activityId/assign
  Body: { childId }
  Response: { assignment }
  
DELETE /families/:familyId/activities/:activityId/assign/:childId
  Response: { success: true }

Activity Completion (Child)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POST /families/:familyId/activities/:activityId/submit
  Body: { notes?, photoUrl? }
  Response: { completion }
  
GET /families/:familyId/activities/:activityId/completions
  Query: { childId?, status?, page, limit }
  Response: { completions: ActivityCompletion[], total, page, pageSize }

Activity Approval (Parent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/completions/pending
  Query: { childId?, page, limit }
  Response: { completions: ActivityCompletion[], total, page, pageSize }
  
POST /families/:familyId/completions/:completionId/approve
  Body: { }
  Response: { completion, xpAwarded, leveledUp }
  
POST /families/:familyId/completions/:completionId/reject
  Body: { reason? }
  Response: { completion }


XP & Level System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/level-config
  Response: { levels: LevelConfig[] }
  
PATCH /families/:familyId/level-config/:level
  Body: { xpThreshold?, dailyScreenTimeMinutes? }
  Response: { levelConfig }
  
GET /families/:familyId/children/:childId/xp
  Response: { totalXp, currentLevel, xpToNextLevel, nextLevel }
  
GET /families/:familyId/children/:childId/xp-history
  Query: { limit? }
  Response: { transactions: XpTransaction[] }
  
POST /families/:familyId/children/:childId/bonus-xp
  Body: { amount, reason }
  Response: { newTotalXp, newLevel, leveledUp }


Screen Time System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/children/:childId/screen-time/status
  Response: { ScreenTimeStatus }
  
POST /families/:familyId/children/:childId/screen-time/session
  Body: { durationMinutes, deviceType? }
  Response: { session }
  
PATCH /families/:familyId/children/:childId/screen-time/session/:sessionId/end
  Response: { session }
  
GET /families/:familyId/children/:childId/screen-time/history
  Query: { days? }
  Response: { sessions: ScreenTimeSession[] }
  
GET /families/:familyId/children/:childId/screen-time/analytics
  Query: { days? }
  Response: { daily: DailyBreakdown[], byDevice: DeviceBreakdown[] }
  
POST /families/:familyId/children/:childId/screen-time/override
  Body: { minutesToAdd, reason }
  Response: { newStatus }


Achievements & Badges
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/achievements
  Response: { achievements: AchievementDefinition[] }
  
GET /families/:familyId/children/:childId/achievements
  Response: { earned: ChildAchievement[], progress: AchievementProgress[] }
  
GET /families/:familyId/achievements/stats
  Response: { totalAvailable, totalEarned, topAchievements }


Streaks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/children/:childId/streaks
  Response: { streaks: ActivityStreak[] }


Leaderboards
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/leaderboards/:type
  Query: { limit? }
  Response: { entries: LeaderboardEntry[], childRank }
  
GET /leaderboards/:leaderboardId
  Query: { limit? }
  Response: { entries: LeaderboardEntry[], name, participating families }
  
GET /families/:familyId/leaderboards/available-cross-family
  Response: { availableLeaderboards: [] }
  
POST /families/:familyId/leaderboards/:leaderboardId/join
  Response: { success: true }
  
DELETE /families/:familyId/leaderboards/:leaderboardId/leave
  Response: { success: true }


Notifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /users/:userId/notifications
  Query: { isRead?, page, limit }
  Response: { notifications: Notification[], total, page, pageSize }
  
PATCH /users/:userId/notifications/:notificationId/read
  Response: { notification }
  
DELETE /users/:userId/notifications/:notificationId
  Response: { success: true }


Analytics & Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/dashboard/parent
  Response: { ParentDashboardData }
  
GET /families/:familyId/dashboard/child/:childId
  Response: { ChildDashboardData }
  
GET /families/:familyId/analytics
  Query: { from?, to?, metric: 'xp'|'activities'|'screenTime' }
  Response: { analytics }


AI Features (Future)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/ai/activity-suggestions/:childId
  Response: { suggestions: ActivitySuggestion[] }
  
POST /families/:familyId/ai/motivation-message/:childId
  Body: { tone? }
  Response: { message }


Audit & Admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET /families/:familyId/audit-log
  Query: { action?, resourceType?, page, limit }
  Response: { logs: AuditLog[], total, page, pageSize }

*/

// ==========================================
// ERROR CODES & STATUS CONVENTIONS
// ==========================================

/*
200 OK - Successful GET/PATCH request
201 Created - Successful POST creating a resource
204 No Content - Successful POST/PATCH with no response body
400 Bad Request - Invalid input
401 Unauthorized - Missing/invalid token
403 Forbidden - User lacks permission
404 Not Found - Resource not found
409 Conflict - Resource already exists / constraint violation
422 Unprocessable Entity - Validation failed
429 Too Many Requests - Rate limited
500 Internal Server Error - Server error
*/

// ==========================================
// MIDDLEWARE STACK
// ==========================================

/*
1. Authentication Middleware (verify JWT)
   - Attach user to request
   - Redirect to login if unauthorized
   
2. Authorization Middleware (check permissions)
   - Check user role
   - Check family membership
   - Check resource ownership
   
3. Rate Limiting Middleware
   - Limit requests per user
   - Stricter limits for mutations
   
4. Request Validation Middleware
   - Validate request body
   - Validate query parameters
   - Validate URL parameters
   
5. Error Handling Middleware
   - Catch errors
   - Log errors
   - Return consistent error responses
   
6. Audit Logging Middleware
   - Log all mutations
   - Store in audit_logs table
*/

// ==========================================
// WEBSOCKET EVENTS (Real-time Updates)
// ==========================================

/*
For real-time features (optional near-term):

SUBSCRIBE events:
- family:activity-completed
- family:activity-approved
- family:level-up
- family:achievement-earned
- family:leaderboard-updated
- child:screen-time-warning
- child:screen-time-blocked

EMIT events:
- child:completed-activity
- parent:approved-activity
- child:leveled-up
- child:earned-achievement
- leaderboard:updated
*/
