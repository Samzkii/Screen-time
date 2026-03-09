// ==========================================
// SCREENTIME GAMIFIED FAMILY APP
// TypeScript Type Definitions
// ==========================================

// ==========================================
// AUTHENTICATION & USER
// ==========================================

export interface AuthToken {
  userId: number;
  familyId: number;
  email: string;
  name: string;
  role: 'parent' | 'child';
}

export interface User {
  id: number;
  familyId: number;
  email: string;
  name: string;
  role: 'parent' | 'child';
  avatarUrl: string | null;
  dateOfBirth: string | null; // ISO date
  totalXp: number;
  currentLevel: number;
  dailyScreenTimeLimit: number;
  weeklyScreenTimeUsed: number;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Family {
  id: number;
  name: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: number;
  familyId: number;
  userId: number;
  inviteToken: string | null;
  inviteAcceptedAt: string | null;
  createdAt: string;
}

// ==========================================
// LEVELS & XP
// ==========================================

export interface LevelConfig {
  id: number;
  familyId: number | null;
  level: number;
  xpThreshold: number;
  dailyScreenTimeMinutes: number;
  createdAt: string;
}

export interface XpTransaction {
  id: number;
  familyId: number;
  childId: number;
  amount: number;
  type: 'completion' | 'bonus' | 'penalty' | 'achievement';
  referenceId: number | null;
  referenceType: string | null;
  reason: string | null;
  createdBy: number | null;
  createdAt: string;
}

// ==========================================
// ACTIVITIES
// ==========================================

export type ActivityType = 'daily' | 'weekly' | 'one-time';
export type ActivityDifficulty = 'easy' | 'medium' | 'hard';

export interface ActivityCategory {
  id: number;
  familyId: number;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
}

export interface Activity {
  id: number;
  familyId: number;
  createdBy: number;
  categoryId: number | null;
  name: string;
  description: string | null;
  type: ActivityType;
  difficulty: ActivityDifficulty;
  xpReward: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityAssignment {
  id: number;
  activityId: number;
  childId: number;
  assignedBy: number;
  assignedAt: string;
}

export type ActivityCompletionStatus = 'pending' | 'approved' | 'rejected';

export interface ActivityCompletion {
  id: number;
  familyId: number;
  activityId: number;
  childId: number;
  status: ActivityCompletionStatus;
  notes: string | null;
  photoUrl: string | null;
  submittedAt: string;
  approvedBy: number | null;
  approvedAt: string | null;
  xpAwarded: number | null;
  createdAt: string;
  updatedAt: string;
}

// Activity with details from child/parent perspective
export interface ActivityDetail extends Activity {
  category?: ActivityCategory;
  createdByUser?: Partial<User>;
  assignedToChildren?: User[];
}

// ==========================================
// SCREEN TIME
// ==========================================

export interface ScreenTimeSession {
  id: number;
  familyId: number;
  childId: number;
  deviceType: 'phone' | 'tablet' | 'computer' | null;
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface ScreenTimeResetLog {
  id: number;
  familyId: number;
  childId: number;
  weekStartDate: string;
  screenTimeUsed: number | null;
  resetAt: string;
}

export interface ScreenTimeStatus {
  childId: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  percentageUsed: number;
  resetDate: string;
}

// ==========================================
// ACHIEVEMENTS
// ==========================================

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type AchievementTriggerType = 
  | 'first_activity' 
  | 'xp_milestone' 
  | 'level_milestone' 
  | 'streak' 
  | 'total_activities';

export interface AchievementDefinition {
  id: number;
  familyId: number | null;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: AchievementRarity;
  triggerType: AchievementTriggerType;
  triggerValue: number | null;
  badgeColor: string | null;
  createdAt: string;
}

export interface ChildAchievement {
  id: number;
  childId: number;
  achievementId: number;
  earnedAt: string;
}

export interface ChildAchievementWithDetails extends ChildAchievement {
  achievement?: AchievementDefinition;
}

// ==========================================
// LEADERBOARDS
// ==========================================

export type LeaderboardType = 'xp' | 'activities' | 'achievements';

export interface Leaderboard {
  id: number;
  familyId: number;
  name: string;
  type: LeaderboardType;
  isActive: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: number;
  leaderboardId: number;
  childId: number;
  rank: number | null;
  score: number;
  updatedAt: string;
}

export interface LeaderboardEntryWithChild extends LeaderboardEntry {
  child?: Partial<User>;
}

export interface FamilyLeaderboardConnection {
  id: number;
  leaderboardId: number;
  familyId: number;
  joinedAt: string;
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export type NotificationType = 
  | 'activity_approved'
  | 'activity_rejected'
  | 'level_up'
  | 'achievement_earned'
  | 'remainder'
  | 'screen_time_warning'
  | 'bonus_xp';

export interface Notification {
  id: number;
  familyId: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ==========================================
// STREAKS
// ==========================================

export interface ActivityStreak {
  id: number;
  childId: number;
  activityId: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  updatedAt: string;
}

// ==========================================
// AI FEATURES
// ==========================================

export interface ActivitySuggestion {
  id: number;
  familyId: number;
  suggestedFor: number;
  suggestedName: string | null;
  suggestedDescription: string | null;
  suggestedDifficulty: ActivityDifficulty | null;
  estimatedXp: number | null;
  reason: string | null;
  createdAt: string;
}

export interface MotivationMessage {
  id: number;
  familyId: number;
  recipientId: number;
  message: string;
  tone: 'encouraging' | 'humorous' | 'serious';
  sentAt: string;
  readAt: string | null;
}

// ==========================================
// AUDIT LOG
// ==========================================

export interface AuditLog {
  id: number;
  familyId: number;
  userId: number | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  changes: Record<string, any> | null;
  createdAt: string;
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// DASHBOARD DATA
// ==========================================

export interface ChildDashboardData {
  user: User;
  currentLevel: LevelConfig;
  nextLevel: LevelConfig | null;
  screenTimeStatus: ScreenTimeStatus;
  pendingActivities: ActivityCompletion[];
  availableActivities: Activity[];
  achievements: ChildAchievementWithDetails[];
  recentXpTransactions: XpTransaction[];
  leaderboardRank: number | null;
  notifications: Notification[];
  streaks: ActivityStreak[];
}

export interface ParentDashboardData {
  family: Family;
  children: User[];
  pendingApprovals: ActivityCompletion[];
  recentActivities: ActivityCompletion[];
  familyLeaderboard: LeaderboardEntryWithChild[];
  familyStats: {
    totalActivitiesCompleted: number;
    totalXpEarned: number;
    averageLevel: number;
  };
}

// ==========================================
// FORM INPUTS
// ==========================================

export interface CreateActivityInput {
  name: string;
  description?: string;
  categoryId?: number;
  type: ActivityType;
  difficulty: ActivityDifficulty;
  xpReward: number;
}

export interface BonusXpInput {
  childId: number;
  amount: number;
  reason: string;
}

export interface ActivityCompletionInput {
  activityId: number;
  notes?: string;
  photoUrl?: string;
}

export interface ApproveActivityInput {
  completionId: number;
  approve: boolean;
  reason?: string;
}

// ==========================================
// GAMIFICATION STATS
// ==========================================

export interface GamificationStats {
  totalActivitiesCompleted: number;
  totalXpEarned: number;
  currentStreak: number;
  achievementsEarned: number;
  leaderboardRank: number;
  levelProgress: {
    current: number;
    next: number;
    xpNeeded: number;
    xpProgress: number;
  };
}
