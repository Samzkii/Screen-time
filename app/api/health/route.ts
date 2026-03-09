import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * GET /api/health
 * 
 * Health check endpoint for production monitoring
 * Used by Docker health checks, load balancers, and monitoring services
 * 
 * Response 200 OK:
 * {
 *   "status": "healthy",
 *   "timestamp": "2024-01-15T10:00:00Z",
 *   "uptime": 3600,
 *   "services": {
 *     "database": "healthy",
 *     "cache": "healthy"
 *   }
 * }
 */

const startTime = Date.now();

async function checkDatabase(): Promise<boolean> {
  try {
    const result = await db.query('SELECT 1');
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check database connectivity
    const dbHealthy = await checkDatabase();

    const uptime = Math.floor((Date.now() - startTime) / 1000);

    const response = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
      },
      version: process.env.APP_VERSION || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
    };

    // Return 200 if healthy, 503 if degraded
    const statusCode = dbHealthy ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
      },
      { status: 503 }
    );
  }
}
