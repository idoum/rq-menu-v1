import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Health Check Endpoint
 * 
 * GET /api/health
 * 
 * Returns the health status of the application and its dependencies.
 * Used by:
 * - Docker healthcheck
 * - Load balancers
 * - Monitoring systems
 * - CI/CD deployment verification
 */
export async function GET() {
  const startTime = Date.now();
  
  const health = {
    status: 'ok' as 'ok' | 'degraded' | 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime(),
    checks: {
      database: {
        status: 'unknown' as 'ok' | 'error',
        latency: 0,
        message: '',
      },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      status: 'ok',
      latency: Date.now() - dbStart,
      message: 'Connected',
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'error',
      latency: 0,
      message: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Calculate total response time
  const totalLatency = Date.now() - startTime;

  // Determine HTTP status code based on health
  const httpStatus = health.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(
    {
      ...health,
      responseTime: totalLatency,
    },
    { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
