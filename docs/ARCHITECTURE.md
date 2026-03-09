// ==========================================
// ARCHITECTURE OVERVIEW
// Production-Ready Gamified Family App
// ==========================================

/*
═══════════════════════════════════════════════════════════════════════════════
SYSTEM ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

Frontend (Next.js React)
  │
  ├─ Pages & Layout
  ├─ Components (Reusable UI)
  ├─ Hooks (Custom logic)
  ├─ Context (State management)
  └─ Styles (Tailwind CSS)
         │
         ▼
  API Layer (/api/v1/*)
         │
         ├─ Auth endpoints
         ├─ Family management
         ├─ Activity endpoints
         ├─ XP & level endpoints
         ├─ Screen time endpoints
         ├─ Achievement endpoints
         ├─ Leaderboard endpoints
         └─ Notification endpoints
         │
         ├─ Middleware Stack
         │  ├─ Authentication (JWT)
         │  ├─ Authorization (permissions)
         │  ├─ Validation (Zod schemas)
         │  ├─ Rate limiting
         │  ├─ Error handling
         │  └─ Audit logging
         │
         ▼
  Game Logic Layer (/lib/game/*)
         │
         ├─ xp-system.ts
         │  ├─ Calculate level from XP
         │  ├─ Award XP on completion
         │  └─ Level-based screen time
         │
         ├─ screen-time-system.ts
         │  ├─ Track screen time usage
         │  ├─ Weekly reset
         │  └─ Device blocking logic
         │
         ├─ activity-system.ts
         │  ├─ Submit completions
         │  ├─ Approve/reject
         │  └─ Streak tracking
         │
         ├─ achievements-system.ts
         │  ├─ Check achievement triggers
         │  └─ Award badges
         │
         └─ leaderboard-system.ts
            ├─ Update rankings
            └─ Cross-family boards
         │
         ▼
  Database Layer (PostgreSQL)
         │
         ├─ Families table
         ├─ Users table
         ├─ Activities table
         ├─ Activity Completions table
         ├─ XP Transactions table
         ├─ Screen Time Sessions table
         ├─ Achievements table
         ├─ Child Achievements table
         ├─ Leaderboards table
         ├─ Notifications table
         ├─ Streaks table
         └─ Audit Log table


═══════════════════════════════════════════════════════════════════════════════
DATA FLOW EXAMPLES
═══════════════════════════════════════════════════════════════════════════════

EXAMPLE 1: Child Completes Activity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Child submits activity via POST /api/v1/families/{id}/activities/{actId}/submit
   └─ Creates ActivityCompletion record with status='pending'
   └─ Creates notification for parents

2. Parent approves via POST /api/v1/families/{id}/completions/{completionId}/approve
   └─ Calls awardXpForActivity() from xp-system.ts
      ├─ Calculates XP based on difficulty multiplier
      ├─ Updates user.total_xp
      ├─ Calculates new level
      ├─ Creates XpTransaction record
      └─ Updates user.daily_screen_time_limit if level up
   
   └─ Calls updateActivityStreak() from activity-system.ts
      ├─ Checks if consecutive day
      └─ Updates or creates ActivityStreak record
   
   └─ Calls checkAndAwardAchievements() from achievements-system.ts
      ├─ Checks all achievement triggers
      ├─ Creates ChildAchievement records for new badges
      └─ Creates notifications for achievements
   
   └─ Calls updateLeaderboardEntries() from leaderboard-system.ts
      ├─ Recalculates XP leaderboard scores
      ├─ Recalculates activities leaderboard
      └─ Updates ranks
   
   └─ Updates ActivityCompletion status='approved'
   └─ Creates notification: "Great job! You earned X XP"


EXAMPLE 2: Weekly Screen Time Reset
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Scheduled job runs at midnight Monday (via cron/scheduler)
   └─ For each family:
      └─ Calls resetWeeklyScreenTime(familyId) from screen-time-system.ts
         ├─ Logs current week's usage in screen_time_reset_log
         ├─ Resets all children's weekly_screen_time_used to 0
         └─ Creates notification: "Screen time reset! You have X minutes"


EXAMPLE 3: Child Levels Up
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. awardXpForActivity() detects level change (calculateLevel returns new level)
   └─ Updates user.current_level
   └─ Gets new daily_screen_time_limit
   └─ Updates user.daily_screen_time_limit
   └─ Potentially awards "level milestone" achievement
   └─ Creates notification: "🎉 You leveled up to Level X! +10 min daily screen time"


═══════════════════════════════════════════════════════════════════════════════
AUTHENTICATION & AUTHORIZATION
═══════════════════════════════════════════════════════════════════════════════

Authentication Flow:
  1. User logs in with email/password
  2. Password verified with bcryptjs.compare()
  3. JWT token created (userId, familyId, email, name, role)
  4. Token stored in secure httpOnly cookie
  5. Token verified on each request via middleware

Authorization Rules:
  - Parents can manage their family's activities/children
  - Children can see only their own activities
  - Children can only complete activities in their family
  - Parents can approve/reject children's submissions
  - Cross-family leaderboards are opt-in
  - Sensitive endpoints require role verification


═══════════════════════════════════════════════════════════════════════════════
STATE MANAGEMENT
═══════════════════════════════════════════════════════════════════════════════

Client-side State:

  React Context:
  - AuthContext: Current user, token, login/logout
  - FamilyContext: Current family, members, settings
  - NotificationContext: Toast notifications

  Custom Hooks (SWR/React Query):
  - useActivities(): Fetch activities, refresh on update
  - useScreenTime(): Fetch screen time status
  - useLeaderboard(): Fetch leaderboard data
  - useAchievements(): Fetch achievements

Server State:
  - All data queried fresh for each request
  - Database is source of truth
  - Caching via HTTP headers (immutable assets)


═══════════════════════════════════════════════════════════════════════════════
SCALABILITY CONSIDERATIONS
═══════════════════════════════════════════════════════════════════════════════

Database:
  ✓ Indexed on frequently queried fields
  ✓ Proper foreign keys for referential integrity
  ✓ Transactions for critical operations
  ✓ JSONB for flexible audit logging

API:
  ✓ Pagination for list endpoints
  ✓ Rate limiting to prevent abuse
  ✓ Connection pooling for DB

Frontend:
  ✓ Code splitting per route
  ✓ Image optimization
  ✓ CSS-in-JS with Tailwind (tree-shaking)

Future Optimizations:
  □ Redis caching for leaderboard scores
  □ Elasticsearch for activity search
  □ Message queue for async jobs (achievements, notifications)
  □ CDN for static assets
  □ Database read replicas


═══════════════════════════════════════════════════════════════════════════════
MOBILE APP INTEGRATION
═══════════════════════════════════════════════════════════════════════════════

Screen Time Integration:

  iOS (Apple Screen Time):
    - Configure via MDM (Mobile Device Management)
    - Use Managed App Config
    - Query device screen time via native bridge
    - React Native bridge communicates limits to app
  
  Android (Digital Wellbeing):
    - Use UsageStatsManager API
    - Set app timers via DevicePolicyManager
    - Receive usage change broadcasts

Flow:
  1. Parent sets screen time limit in Screentime app (e.g., 60 min)
  2. Screentime API sends to device via native bridge
  3. Device enforces limit via OS
  4. If limit exceeded, device is locked (except phone calling)
  5. Session logs sent back to Screentime backend
  6. Dashboard shows real usage vs allocated


═══════════════════════════════════════════════════════════════════════════════
DEPLOYMENT ARCHITECTURE
═══════════════════════════════════════════════════════════════════════════════

Development:
  - Local PostgreSQL
  - npm run dev
  - Hot reload

Staging:
  - Separate staging database
  - Deploy via git push
  - Full testing before production

Production:
  - Managed PostgreSQL (e.g., AWS RDS)
  - Docker containers on Kubernetes (or Vercel)
  - Environment variables for secrets
  - Automated backups
  - CDN for static assets
  - SSL/TLS for all traffic

CI/CD Pipeline:
  1. Push to main branch
  2. Run tests (unit, integration, E2E)
  3. Build Docker image
  4. Push to registry
  5. Deploy to staging
  6. Run smoke tests
  7. Deploy to production


═══════════════════════════════════════════════════════════════════════════════
SECURITY CONSIDERATIONS
═══════════════════════════════════════════════════════════════════════════════

Authentication:
  ✓ Passwords hashed with bcryptjs (rounds: 12)
  ✓ JWT in httpOnly cookies (not localStorage)
  ✓ CSRF tokens for form submissions
  ✓ Rate limiting on auth endpoints

Authorization:
  ✓ Family ID checked on all family operations
  ✓ User role verified (parent-only operations)
  ✓ Child can only see own activities/screen time

Data Protection:
  ✓ HTTPS/TLS for all communication
  ✓ Database encryption at rest
  ✓ Regular backups
  ✓ PII (Personally Identifiable Information) handling:
    - Minimal data collection
    - GDPR/COPPA compliant
    - Parental consent for children
    - Right to deletion

Input Validation:
  ✓ Zod schemas for all API inputs
  ✓ SQL injection prevention (parameterized queries)
  ✓ XSS prevention (React escaping)
  ✓ CORS properly configured

Logging & Monitoring:
  ✓ Audit log for all mutations
  ✓ Error logging with context
  ✓ Performance monitoring
  ✓ Security alerts for suspicious activity


═══════════════════════════════════════════════════════════════════════════════
TESTING STRATEGY
═══════════════════════════════════════════════════════════════════════════════

Unit Tests (Jest):
  - XP calculation logic
  - Level determination
  - Streak calculations
  - Achievement trigger checks
  - Screen time calculations

Integration Tests:
  - Activity completion flow
  - XP award and level up
  - Achievement unlock
  - Leaderboard updates

E2E Tests (Playwright):
  - User registration & login
  - Complete activity flow
  - Parent approves completion
  - Check level up & notifications
  - Leaderboard updates

Test Coverage Target: 80%+
*/
