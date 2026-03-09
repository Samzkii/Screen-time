// ==========================================
// NEXT.JS FOLDER STRUCTURE
// Production-Ready Gamified Family App
// ==========================================

screentime-app/
│
├── app/                                    # Next.js App Router
│   ├── api/                               # API Routes
│   │   └── v1/
│   │       ├── auth/
│   │       │   ├── register/route.ts
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   ├── refresh-token/route.ts
│   │       │   └── me/route.ts
│   │       │
│   │       ├── families/
│   │       │   ├── [familyId]/
│   │       │   │   ├── route.ts (GET, PATCH, DELETE core family)
│   │       │   │   ├── members/route.ts (GET members, DELETE member)
│   │       │   │   ├── invite/route.ts (POST invite, POST accept-invite)
│   │       │   │   ├── dashboard/route.ts (parent/child dashboard data)
│   │       │   │   ├── analytics/route.ts (family stats)
│   │       │   │   ├── audit-log/route.ts (audit trail)
│   │       │   │   │
│   │       │   │   ├── activities/
│   │       │   │   │   ├── route.ts (GET all, POST create)
│   │       │   │   │   ├── [activityId]/
│   │       │   │   │   │   ├── route.ts (GET, PATCH, DELETE)
│   │       │   │   │   │   ├── assign/route.ts (POST assign, DELETE unassign)
│   │       │   │   │   │   ├── submit/route.ts (POST child submission)
│   │       │   │   │   │   └── completions/route.ts (GET all completions)
│   │       │   │   │
│   │       │   │   ├── categories/
│   │       │   │   │   ├── route.ts (GET all, POST create)
│   │       │   │   │   └── [categoryId]/
│   │       │   │   │       └── route.ts (GET, PATCH, DELETE)
│   │       │   │   │
│   │       │   │   ├── completions/
│   │       │   │   │   ├── pending/route.ts (GET pending)
│   │       │   │   │   └── [completionId]/
│   │       │   │   │       ├── approve/route.ts (POST)
│   │       │   │   │       └── reject/route.ts (POST)
│   │       │   │   │
│   │       │   │   ├── level-config/
│   │       │   │   │   ├── route.ts (GET all levels)
│   │       │   │   │   └── [...level]/route.ts (PATCH specific level)
│   │       │   │   │
│   │       │   │   ├── children/
│   │       │   │   │   └── [childId]/
│   │       │   │   │       ├── xp/
│   │       │   │   │       │   ├── route.ts (GET xp status)
│   │       │   │   │       │   ├── history/route.ts (GET transactions)
│   │       │   │   │       │   └── bonus/route.ts (POST bonus xp)
│   │       │   │   │       │
│   │       │   │   │       ├── screen-time/
│   │       │   │   │       │   ├── status/route.ts (GET status)
│   │       │   │   │       │   ├── session/route.ts (POST/PATCH session)
│   │       │   │   │       │   ├── history/route.ts (GET history)
│   │       │   │   │       │   ├── analytics/route.ts (GET analytics)
│   │       │   │   │       │   └── override/route.ts (POST override)
│   │       │   │   │       │
│   │       │   │   │       ├── achievements/
│   │       │   │   │       │   ├── route.ts (GET achievements)
│   │       │   │   │       │   └── progress/route.ts (GET progress)
│   │       │   │   │       │
│   │       │   │   │       ├── streaks/route.ts (GET streaks)
│   │       │   │   │       │
│   │       │   │   │       └── dashboard/route.ts (child dashboard)
│   │       │   │   │
│   │       │   │   ├── achievements/
│   │       │   │   │   ├── route.ts (GET definitions)
│   │       │   │   │   └── stats/route.ts (GET stats)
│   │       │   │   │
│   │       │   │   └── leaderboards/
│   │       │   │       ├── [...type]/route.ts (GET family leaderboard)
│   │       │   │       ├── cross-family/route.ts (GET available)
│   │       │   │       └── [leaderboardId]/
│   │       │   │           ├── join/route.ts (POST)
│   │       │   │           ├── leave/route.ts (DELETE)
│   │       │   │           └── route.ts (GET)
│   │       │   │
│   │       │   └── route.ts (POST create family)
│   │       │
│   │       ├── users/
│   │       │   ├── [userId]/
│   │       │   │   └── route.ts (GET, PATCH profile)
│   │       │   │
│   │       │   └── notifications/
│   │       │       ├── route.ts (GET notifications)
│   │       │       └── [notificationId]/
│   │       │           ├── read/route.ts (PATCH read)
│   │       │           └── route.ts (DELETE)
│   │       │
│   │       └── health/route.ts (health check)
│   │
│   ├── (auth)/                            # Auth pages layout group
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (app)/                             # App pages layout group
│   │   ├── layout.tsx (with navbar, sidebar)
│   │   ├── dashboard/page.tsx (redirect to role-specific)
│   │   │
│   │   ├── parent/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── activities/page.tsx
│   │   │   ├── children/[childId]/page.tsx
│   │   │   ├── leaderboards/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── child/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── activities/page.tsx
│   │   │   ├── achievements/page.tsx
│   │   │   ├── leaderboards/page.tsx
│   │   │   ├── screen-time/page.tsx
│   │   │   └── profile/page.tsx
│   │   │
│   │   └── family/
│   │       ├── settings/page.tsx
│   │       ├── members/page.tsx
│   │       └── invite/page.tsx
│   │
│   ├── layout.tsx (root layout)
│   ├── page.tsx (landing page)
│   ├── not-found.tsx
│   └── error.tsx
│
├── lib/                                    # Shared utilities & logic
│   ├── db.ts (PostgreSQL connection)
│   ├── db-init.ts (schema initialization)
│   │
│   ├── types/
│   │   └── index.ts (all TypeScript types)
│   │
│   ├── auth/
│   │   ├── jwt.ts (JWT utilities)
│   │   ├── bcrypt.ts (password hashing)
│   │   └── middleware.ts (auth middleware)
│   │
│   ├── game/
│   │   ├── xp-system.ts (XP & levels)
│   │   ├── screen-time-system.ts (screen time management)
│   │   ├── activity-system.ts (activities & approvals)
│   │   ├── achievements-system.ts (achievements & badges)
│   │   └── leaderboard-system.ts (leaderboards)
│   │
│   ├── validation/
│   │   ├── auth-schemas.ts (Zod schemas for auth)
│   │   ├── activity-schemas.ts
│   │   └── family-schemas.ts
│   │
│   ├── errors/
│   │   ├── api-error.ts (custom error class)
│   │   └── handlers.ts (error middleware)
│   │
│   ├── constants/
│   │   ├── xp-multipliers.ts
│   │   ├── achievements.ts
│   │   └── notifications.ts
│   │
│   ├── utils/
│   │   ├── date-utils.ts (week calculations, etc)
│   │   ├── api-utils.ts (response formatting, pagination)
│   │   ├── notification-utils.ts (notification creation)
│   │   └── audit-utils.ts (audit logging)
│   │
│   └── database/
│       ├── schema.sql (full database schema)
│       ├── migrations/ (future schema changes)
│       └── seeds/ (test data)
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── ForgotPasswordForm.tsx
│   │
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   │
│   ├── dashboard/
│   │   ├── ParentDashboard.tsx
│   │   ├── ChildDashboard.tsx
│   │   ├── StatCard.tsx
│   │   └── QuickActions.tsx
│   │
│   ├── activities/
│   │   ├── ActivityList.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── CreateActivityForm.tsx
│   │   ├── CompleteActivityModal.tsx
│   │   └── ApproveActivityCard.tsx
│   │
│   ├── gamification/
│   │   ├── XpBar.tsx
│   │   ├── LevelBadge.tsx
│   │   ├── AchievementBadge.tsx
│   │   ├── AchievementUnlocked.tsx
│   │   └── Leaderboard.tsx
│   │
│   ├── screen-time/
│   │   ├── ScreenTimeStatus.tsx
│   │   ├── ScreenTimeChart.tsx
│   │   └── DeviceBreakdown.tsx
│   │
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   ├── NotificationList.tsx
│   │   └── NotificationItem.tsx
│   │
│   └── common/
│       ├── Modal.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Loading.tsx
│       ├── Empty.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/
│   ├── useAuth.ts (auth context)
│   ├── useFamily.ts (family context)
│   ├── useUser.ts (user data)
│   ├── useActivities.ts (activity data)
│   ├── useScreenTime.ts (screen time status)
│   ├── useLeaderboard.ts (leaderboard data)
│   ├── useFetch.ts (generic data fetching)
│   └── useNotifications.ts (notifications)
│
├── contexts/
│   ├── AuthContext.tsx
│   ├── FamilyContext.tsx
│   └── NotificationContext.tsx
│
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── animations.css
│
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── docs/
│   ├── API_DESIGN.md (API routes reference)
│   ├── DATABASE.md (schema documentation)
│   ├── DEPLOYMENT.md (deployment guide)
│   ├── ARCHITECTURE.md (architecture overview)
│   └── MOBILE_INTEGRATION.md (mobile app integration)
│
├── .env.local (secrets - NOT in git)
├── .env.example (template)
├── .gitignore
├── .eslintrc.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── README.md

// ==========================================
// IMPORTANT CONVENTIONS
// ==========================================

API Routes:
- All routes use /api/v1 prefix for versioning
- Endpoint naming: /families/{familyId}/resource-type/[resourceId]/action
- Consistent error response format
- Request validation with Zod schemas
- Comprehensive error logging

Components:
- Functional components with React hooks
- TypeScript for type safety
- Separated concerns (presentational vs container)
- Reusable design system components
- Accessible (WCAG 2.1 AA)

Hooks:
- Custom hooks for data fetching and state management
- React Query or SWR for server state
- Context API for client state
- Memoization where appropriate

Database:
- PostgreSQL with proper indexing
- Transactions for critical operations
- Efficient queries with JOIN optimization
- Regular backups and disaster recovery

Authentication:
- JWT stored in secure httpOnly cookies
- Refresh token rotation
- CSRF protection
- Rate limiting on auth endpoints

Testing:
- Unit tests for utilities (Jest)
- Integration tests for API routes
- E2E tests for critical flows (Playwright)
- Component testing (React Testing Library)

Deployment:
- Environment-based configuration
- Database migrations tracked
- Docker containerization
- CI/CD pipeline (GitHub Actions)
