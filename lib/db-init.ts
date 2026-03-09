import { query } from '@/lib/db';

export async function initializeDatabase() {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('parent', 'kid')),
        parent_id INT REFERENCES users(id),
        level INT DEFAULT 1 CHECK (level >= 1 AND level <= 10),
        total_screen_time_earned INT DEFAULT 0,
        total_screen_time_used INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create chores table
    await query(`
      CREATE TABLE IF NOT EXISTS chores (
        id SERIAL PRIMARY KEY,
        kid_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INT NOT NULL,
        base_screen_time_minutes INT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create activities table (similar to chores)
    await query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        kid_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INT NOT NULL,
        base_screen_time_minutes INT NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create screen time logs table
    await query(`
      CREATE TABLE IF NOT EXISTS screen_time_logs (
        id SERIAL PRIMARY KEY,
        kid_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        chore_id INT REFERENCES chores(id) ON DELETE SET NULL,
        activity_id INT REFERENCES activities(id) ON DELETE SET NULL,
        duration_minutes INT NOT NULL,
        multiplier DECIMAL(3,2) NOT NULL,
        earned_minutes INT NOT NULL,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_chores_kid_id ON chores(kid_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_chores_parent_id ON chores(parent_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activities_kid_id ON activities(kid_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_activities_parent_id ON activities(parent_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_screen_time_logs_kid_id ON screen_time_logs(kid_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);`);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
