-- ==========================================
-- SCREENTIME GAMIFIED FAMILY APP
-- Production-Ready Database Schema
-- ==========================================

-- ==========================================
-- FAMILIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_families_created_by ON families(created_by);

-- ==========================================
-- USERS TABLE (Parents & Children)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('parent', 'child')),
  avatar_url VARCHAR(500),
  
  -- Child-specific fields
  date_of_birth DATE,
  
  -- XP & Level
  total_xp INT DEFAULT 0,
  current_level INT DEFAULT 1,
  
  -- Screen Time
  daily_screen_time_limit INT DEFAULT 60, -- minutes, determined by level
  weekly_screen_time_used INT DEFAULT 0, -- resets weekly
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ==========================================
-- FAMILY CONNECTIONS (Multi-parent families)
-- ==========================================
CREATE TABLE IF NOT EXISTS family_members (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_token VARCHAR(255) UNIQUE,
  invite_accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_id, user_id)
);

CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);

-- ==========================================
-- LEVEL CONFIGURATION
-- Defines XP thresholds and screen time allowance per level
-- ==========================================
CREATE TABLE IF NOT EXISTS level_config (
  id SERIAL PRIMARY KEY,
  family_id INT REFERENCES families(id) ON DELETE CASCADE,
  level INT NOT NULL CHECK (level >= 1 AND level <= 100),
  xp_threshold INT NOT NULL,
  daily_screen_time_minutes INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_id, level)
);

CREATE INDEX idx_level_config_family_level ON level_config(family_id, level);

-- ==========================================
-- ACTIVITY TYPES & TEMPLATES
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_categories (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7), -- hex color
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_id, name)
);

CREATE INDEX idx_activity_categories_family ON activity_categories(family_id);

-- ==========================================
-- ACTIVITIES / TASKS
-- ==========================================
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES activity_categories(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'one-time')),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  xp_reward INT NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_family_id ON activities(family_id);
CREATE INDEX idx_activities_created_by ON activities(created_by);
CREATE INDEX idx_activities_type ON activities(type);

-- ==========================================
-- ACTIVITY ASSIGNMENTS
-- Which children can/are assigned activities
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_assignments (
  id SERIAL PRIMARY KEY,
  activity_id INT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(activity_id, child_id)
);

CREATE INDEX idx_activity_assignments_child_id ON activity_assignments(child_id);
CREATE INDEX idx_activity_assignments_activity_id ON activity_assignments(activity_id);

-- ==========================================
-- ACTIVITY COMPLETIONS / SUBMISSIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_completions (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  activity_id INT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Evidence
  notes VARCHAR(500),
  photo_url VARCHAR(500),
  
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  
  -- XP awarded (stored for audit trail)
  xp_awarded INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_completions_child_id ON activity_completions(child_id);
CREATE INDEX idx_activity_completions_activity_id ON activity_completions(activity_id);
CREATE INDEX idx_activity_completions_status ON activity_completions(status);
CREATE INDEX idx_activity_completions_submitted_at ON activity_completions(submitted_at);

-- ==========================================
-- XP TRANSACTION LOG
-- Audit trail for all XP changes
-- ==========================================
CREATE TABLE IF NOT EXISTS xp_transactions (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  amount INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'completion', 'bonus', 'penalty', 'achievement'
  reference_id INT, -- Links to activity_completion or achievement
  reference_type VARCHAR(50),
  
  reason VARCHAR(255),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_xp_transactions_child_id ON xp_transactions(child_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at);

-- ==========================================
-- SCREEN TIME USAGE TRACKING
-- ==========================================
CREATE TABLE IF NOT EXISTS screen_time_sessions (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  device_type VARCHAR(50), -- 'phone', 'tablet', 'computer'
  duration_minutes INT NOT NULL,
  
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_screen_time_sessions_child_id ON screen_time_sessions(child_id);
CREATE INDEX idx_screen_time_sessions_started_at ON screen_time_sessions(started_at);

-- ==========================================
-- SCREEN TIME WEEKLY RESET LOG
-- ==========================================
CREATE TABLE IF NOT EXISTS screen_time_reset_log (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  week_start_date DATE NOT NULL,
  screen_time_used INT,
  reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(child_id, week_start_date)
);

CREATE INDEX idx_screen_time_reset_log_child_id ON screen_time_reset_log(child_id);

-- ==========================================
-- ACHIEVEMENTS / BADGES
-- ==========================================
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id SERIAL PRIMARY KEY,
  family_id INT REFERENCES families(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(500),
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  
  -- Achievement trigger
  trigger_type VARCHAR(100) NOT NULL, -- 'first_activity', 'xp_milestone', 'level_milestone', 'streak', 'total_activities'
  trigger_value INT, -- e.g. for 'xp_milestone' = 1000 XP
  
  badge_color VARCHAR(7),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(family_id, trigger_type, trigger_value)
);

CREATE INDEX idx_achievement_definitions_family ON achievement_definitions(family_id);

-- ==========================================
-- CHILD ACHIEVEMENTS (Earned badges)
-- ==========================================
CREATE TABLE IF NOT EXISTS child_achievements (
  id SERIAL PRIMARY KEY,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(child_id, achievement_id)
);

CREATE INDEX idx_child_achievements_child_id ON child_achievements(child_id);
CREATE INDEX idx_child_achievements_earned_at ON child_achievements(earned_at);

-- ==========================================
-- LEADERBOARDS
-- ==========================================
CREATE TABLE IF NOT EXISTS leaderboards (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('xp', 'activities', 'achievements')),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_id, type)
);

CREATE INDEX idx_leaderboards_family_id ON leaderboards(family_id);

-- ==========================================
-- CROSS-FAMILY LEADERBOARDS
-- ==========================================
CREATE TABLE IF NOT EXISTS family_leaderboard_connections (
  id SERIAL PRIMARY KEY,
  leaderboard_id INT NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(leaderboard_id, family_id)
);

CREATE INDEX idx_family_leaderboard_connections_leaderboard ON family_leaderboard_connections(leaderboard_id);

-- ==========================================
-- LEADERBOARD ENTRIES (Cached/computed)
-- ==========================================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  leaderboard_id INT NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  rank INT,
  score INT NOT NULL, -- XP, activity count, or achievement count
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(leaderboard_id, child_id)
);

CREATE INDEX idx_leaderboard_entries_leaderboard_id ON leaderboard_entries(leaderboard_id);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type VARCHAR(100) NOT NULL, -- 'activity_approved', 'level_up', 'achievement_earned', 'reminder'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ==========================================
-- STRAINS / STREAK TRACKING
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_streaks (
  id SERIAL PRIMARY KEY,
  child_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id INT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  
  last_completed_date DATE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(child_id, activity_id)
);

CREATE INDEX idx_activity_streaks_child_id ON activity_streaks(child_id);

-- ==========================================
-- AI ACTIVITY SUGGESTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_suggestions (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  suggested_for INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  suggested_name VARCHAR(255),
  suggested_description TEXT,
  suggested_difficulty VARCHAR(20),
  estimated_xp INT,
  
  reason VARCHAR(255), -- e.g., "Based on xyz performance"
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_suggestions_family_id ON activity_suggestions(family_id);

-- ==========================================
-- MOTIVATION MESSAGES (AI-generated)
-- ==========================================
CREATE TABLE IF NOT EXISTS motivation_messages (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  recipient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  tone VARCHAR(50), -- 'encouraging', 'humorous', 'serious'
  
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX idx_motivation_messages_recipient ON motivation_messages(recipient_id);

-- ==========================================
-- AUDIT LOG
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id INT,
  
  changes JSONB, -- Store what changed
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_family_id ON audit_logs(family_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ==========================================
-- SESSIONS (JWT sessions)
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  token_hash VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
