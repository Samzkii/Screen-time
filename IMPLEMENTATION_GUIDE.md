# Screentime: Gamified Family Activity Platform
## Production-Ready Implementation Guide

A Next.js 16 full-stack application that gamifies household activities and screen time management for families.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Routes](#api-routes)
5. [Game Mechanics](#game-mechanics)
6. [Data Models](#data-models)
7. [Development Workflow](#development-workflow)
8. [Deployment Guide](#deployment-guide)

---

## 🏗️ Architecture Overview

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 18, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, Node.js |
| **Database** | PostgreSQL 14+ |
| **Authentication** | JWT + bcryptjs + httpOnly cookies |
| **Validation** | Zod schemas |

### Folder Structure

```
screentime/
├── app/
│   ├── api/v1/
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   └── families/
│   │       ├── [familyId]/
│   │       │   ├── activities/
│   │       │   ├── completions/
│   │       │   ├── dashboard/route.ts
│   │       │   └── ...
│   │       └── ...
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── ...
│   ├── dashboard/
│   │   ├── (parent)/
│   │   └── (child)/
│   └── ...
├── lib/
│   ├── auth/
│   │   └── middleware.ts
│   ├── database/
│   │   ├── schema.sql
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   ├── game/
│   │   ├── xp-system.ts
│   │   ├── screen-time-system.ts
│   │   ├── activity-system.ts
│   │   ├── achievements-system.ts
│   │   └── leaderboard-system.ts
│   ├── utils/
│   └── ...
├── public/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_DESIGN.md
│   ├── GAMIFICATION_STRATEGY.md
│   └── ...
├── package.json
├── tsconfig.json
└── .env.local
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repo-url>
cd screentime

# Install dependencies
npm install

# Create database
createdb screentime-dev

# Initialize schema
psql screentime-dev < lib/database/schema.sql

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/screentime-dev

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=development

# API
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### Start Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000`

---

## 🔐 Authentication & Authorization

### Authentication Flow

#### Signup (Create Family)

```bash
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "parent@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "familyName": "Doe Family"
}

# Response (201 Created)
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "parent@example.com",
    "name": "John Doe",
    "role": "parent",
    "familyId": "family-uuid",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "family": {
    "id": "family-uuid",
    "name": "Doe Family",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}

# Cookie Set: auth_token (httpOnly, 7 days)
```

#### Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "parent@example.com",
  "password": "securePassword123"
}

# Response (200 OK)
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "parent@example.com",
    "name": "John Doe",
    "role": "parent",
    "familyId": "family-uuid",
    "currentLevel": 1,
    "totalXp": 0,
    "dailyScreenTimeLimit": 0
  },
  "family": {
    "id": "family-uuid",
    "name": "Doe Family"
  }
}

# Cookie Set: auth_token (httpOnly, 7 days)
```

### JWT Token Structure

```typescript
{
  userId: "uuid",
  familyId: "uuid",
  email: "parent@example.com",
  name: "John Doe",
  role: "parent" | "child",
  iat: 1234567890,
  exp: 1234654290  // 7 days from issue
}
```

### Authorization Middleware

```typescript
// Use in protected routes
import { verifyAuth, verifyFamilyAccess } from '@/lib/auth/middleware';

export async function GET(request: NextRequest, { params }) {
  // Verify authentication
  const auth = await verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { userId, familyId, role } = auth.payload;

  // Verify family access
  const requestFamilyId = (await params).familyId;
  if (!verifyFamilyAccess(requestFamilyId, familyId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Safe to proceed - user has access to this family
}
```

### Role-Based Access Control

| Action | Parent | Child |
|--------|--------|-------|
| Create activity | ✅ | ❌ |
| Submit activity | ❌ | ✅ |
| Approve activity | ✅ | ❌ |
| View family dashboard | ✅ | ✅ |
| Manage screen time | ✅ | ❌ |
| View XP leaderboard | ✅ | ✅ |

---

## 📡 API Routes

### Authentication Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/signup` | Create new family + parent account |
| POST | `/api/v1/auth/login` | Authenticate user |
| POST | `/api/v1/auth/logout` | Clear session |
| GET | `/api/v1/auth/me` | Get current user info |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |

### Family Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/families/[familyId]` | Get family details |
| PUT | `/api/v1/families/[familyId]` | Update family settings |
| GET | `/api/v1/families/[familyId]/members` | List family members |
| POST | `/api/v1/families/[familyId]/members` | Add child to family |
| GET | `/api/v1/families/[familyId]/dashboard` | Fetch dashboard data |

### Activity Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/families/[familyId]/activities` | List activities |
| POST | `/api/v1/families/[familyId]/activities` | Create activity |
| PUT | `/api/v1/families/[familyId]/activities/[id]` | Update activity |
| DELETE | `/api/v1/families/[familyId]/activities/[id]` | Delete activity |
| POST | `/api/v1/families/[familyId]/activities/[id]/submit` | Submit completion |

### Activity Completions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/families/[familyId]/completions` | List completions |
| POST | `/api/v1/families/[familyId]/completions/[id]/approve` | Approve submission |
| POST | `/api/v1/families/[familyId]/completions/[id]/reject` | Reject submission |

### XP & Levels

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/families/[familyId]/users/[userId]/xp` | Get XP details |
| POST | `/api/v1/families/[familyId]/users/[userId]/xp/adjust` | Manual XP adjustment (parent only) |

### Screen Time

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/families/[familyId]/screen-time/status` | Get screen time status |
| GET | `/api/v1/families/[familyId]/screen-time/history` | Get usage history |
| POST | `/api/v1/families/[familyId]/screen-time/session` | Log screen time session |

### Leaderboards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/families/[familyId]/leaderboards/xp` | XP ranking |
| GET | `/api/v1/families/[familyId]/leaderboards/activities` | Activity ranking |
| GET | `/api/v1/families/[familyId]/leaderboards/achievements` | Achievement ranking |
| GET | `/api/v1/leaderboards/global` | Cross-family ranking |

### Achievements

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/families/[familyId]/users/[userId]/achievements` | Get achievements |
| GET | `/api/v1/families/[familyId]/achievements/definitions` | Get all achievement types |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/[userId]/notifications` | Get user's notifications |
| PUT | `/api/v1/users/[userId]/notifications/[id]` | Mark as read |

---

## 🎮 Game Mechanics

### XP System

#### Level Configuration

```typescript
// From lib/game/xp-system.ts
DEFAULT_LEVEL_CONFIG = {
  1: { threshold: 0, dailyScreenTime: 20 },      // Starting level
  2: { threshold: 100, dailyScreenTime: 30 },
  3: { threshold: 300, dailyScreenTime: 45 },
  4: { threshold: 700, dailyScreenTime: 60 },
  5: { threshold: 1200, dailyScreenTime: 75 },   // Midpoint
  6: { threshold: 1800, dailyScreenTime: 90 },
  7: { threshold: 2500, dailyScreenTime: 105 },
  8: { threshold: 3300, dailyScreenTime: 120 },
  9: { threshold: 4200, dailyScreenTime: 135 },
  10: { threshold: 5200, dailyScreenTime: 150 }   // Max level
};

XP_MULTIPLIERS_BY_DIFFICULTY = {
  easy: 1.0,    // 10 XP base = 10 XP awarded
  medium: 1.5,  // 10 XP base = 15 XP awarded
  hard: 2.0     // 10 XP base = 20 XP awarded
};
```

#### XP Award Flow

```
1. Activity submitted by child
2. Parent approves
3. awardXpForActivity() called:
   - Calculate XP: baseXp × difficultyMultiplier
   - Update user.total_xp
   - Calculate new level (binary search on thresholds)
   - If level-up: Update user.daily_screen_time_limit, create notification
   - Log XpTransaction (immutable audit trail)
4. Return { xpAwarded, leveledUp, newLevel }
```

#### Example Activity XP Values

| Activity Type | Difficulty | Base XP | Awarded XP |
|---------------|-----------|---------|-----------|
| Take out trash | Easy | 10 | 10 |
| Do dishes | Medium | 15 | 22 |
| Mow lawn | Hard | 30 | 60 |
| Quick cleanup | Easy | 5 | 5 |
| Organize room | Medium | 20 | 30 |
| Deep clean | Hard | 50 | 100 |

### Screen Time System

#### How It Works

```
1. Child earns XP by completing activities
2. XP total determines their level
3. Level determines daily screen time allowance:
   - Level 1 = 20 minutes/day
   - Level 10 = 150 minutes/day

4. Screen time resets weekly (Monday at 00:00)
5. Weekly reset runs via scheduled job (cron)

6. Session tracking:
   - Each device usage logged to screen_time_sessions
   - Compared against daily_screen_time_limit
   - If exceeded: Device is blocked (via iOS/Android integration)

7. Analytics:
   - Weekly summary
   - Device breakdown
   - Trends over time
```

---

## 📊 Data Models

See the database schema at `lib/database/schema.sql`

---

## 🛠️ Development Workflow

### Building a New Protected Route

```typescript
import { verifyAuth, verifyFamilyAccess } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ familyId: string }> }
) {
  const auth = await verifyAuth(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { userId, familyId, role } = auth.payload;
  const { familyId: requestFamilyId } = await params;

  if (!verifyFamilyAccess(requestFamilyId, familyId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Your logic here
  return NextResponse.json({ success: true });
}
```

---

## 📞 Documentation Files

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design & data flows
- [API_DESIGN.md](./docs/API_DESIGN.md) - Complete API specification
- [GAMIFICATION_STRATEGY.md](./docs/GAMIFICATION_STRATEGY.md) - Game mechanics & retention
- [FOLDER_STRUCTURE.md](./docs/FOLDER_STRUCTURE.md) - Project organization

---

**Status:** Production Ready MVP  
**Last Updated:** January 2024  
**Version:** 1.0.0
