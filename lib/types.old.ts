export interface User {
  id: number;
  email: string;
  name: string;
  role: 'parent' | 'kid';
  parentId: number | null;
  level: number;
  totalScreenTimeEarned: number;
  totalScreenTimeUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chore {
  id: number;
  kidId: number;
  parentId: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  baseScreenTimeMinutes: number;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: number;
  kidId: number;
  parentId: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  baseScreenTimeMinutes: number;
  activityType: string;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScreenTimeLog {
  id: number;
  kidId: number;
  choreId: number | null;
  activityId: number | null;
  durationMinutes: number;
  multiplier: number;
  earnedMinutes: number;
  loggedAt: Date;
}

export interface AuthToken {
  userId: number;
  email: string;
  role: 'parent' | 'kid';
}
