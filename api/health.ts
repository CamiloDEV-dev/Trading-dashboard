import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '../src/db/supabase';
import { CachedDatabaseClient } from '../src/db/cached-client';
import { cacheManager } from '../src/db/cache';
import { securityMiddleware } from '../src/middleware/security';

// Track application start time for uptime calculation
const startTime = Date.now();

/**
 * GET /api/health - System health and monitoring endpoint
 * 
 * Returns:
 * - Current run_id, uptime, and simulation status
 * - Database connection status
 * - Cache statistics
 * - Error handling for database connectivity issues
 * 
 * Requirements: 10.1, 10.3, 10.5
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply security middleware (CORS, rate limiting)
  const security = securityMiddleware({ 
    enableCors: true, 
    enableRateLimit: true, 
    rateLimitType: 'default' 
  });
  
  if (!security(req, res)) {
    return; // Security middleware handled the response
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED' 
    });
  }

  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor((Date.now() - startTime) / 1000),
      human_readable: formatUptime(Date.now() - startTime)
    },
    database: {
      connected: false,
      response_time_ms: 0,
      error: null as string | null
    },
    simulation: {
      run_id: null as string | null,
      is_paused: null as boolean | null,
      target_price: null as number | null,
      last_tick_age_ms: null as number | null
    },
    cache: {
      stats: null as any,
      enabled: true
    },
    version: {
      api: '1.0.0',
      node: process.version,
      platform: process.platform
    }
  };

  try {
    // Initialize database client
    const supabaseClient = new SupabaseClient();
    const cachedClient = new CachedDatabaseClient(supabaseClient, cacheManager);

    // Test database connection with timing
    const dbStartTime = Date.now();
    let dbConnected = false;
    
    try {
      dbConnected = await supabaseClient.testConnection();
      healthCheck.database.connected = dbConnected;
      healthCheck.database.response_time_ms = Date.now() - dbStartTime;
    } catch (dbError) {
      healthCheck.database.connected = false;
      healthCheck.database.response_time_ms = Date.now() - dbStartTime;
      healthCheck.database.error = dbError instanceof Error ? dbError.message : 'Unknown database error';
      healthCheck.status = 'degraded';
    }

    // Get simulation status if database is connected
    if (dbConnected) {
      try {
        const [settings, latestTick] = await Promise.allSettled([
          cachedClient.getLatestSettings(),
          cachedClient.getLatestTick()
        ]);

        // Extract settings data
        if (settings.status === 'fulfilled' && settings.value) {
          healthCheck.simulation.run_id = settings.value.run_id;
          healthCheck.simulation.is_paused = settings.value.is_paused;
          healthCheck.simulation.target_price = settings.value.target_price;
        }

        // Calculate last tick age
        if (latestTick.status === 'fulfilled' && latestTick.value) {
          const tickTime = new Date(latestTick.value.timestamp).getTime();
          healthCheck.simulation.last_tick_age_ms = Date.now() - tickTime;
        }

        // Check if simulation is stale (no ticks in last 10 seconds)
        if (healthCheck.simulation.last_tick_age_ms && healthCheck.simulation.last_tick_age_ms > 10000) {
          healthCheck.status = 'degraded';
        }

      } catch (simError) {
        console.warn('Error getting simulation status:', simError);
        // Don't fail health check for simulation errors, just mark as degraded
        healthCheck.status = 'degraded';
      }
    }

    // Get cache statistics
    try {
      healthCheck.cache.stats = cachedClient.getCacheStats();
    } catch (cacheError) {
      console.warn('Error getting cache stats:', cacheError);
      healthCheck.cache.enabled = false;
    }

    // Determine overall health status
    if (!healthCheck.database.connected) {
      healthCheck.status = 'unhealthy';
    } else if (healthCheck.database.response_time_ms > 5000) {
      healthCheck.status = 'degraded';
    }

    // Set appropriate HTTP status code
    let httpStatus = 200;
    if (healthCheck.status === 'degraded') {
      httpStatus = 200; // Still return 200 for degraded but functional
    } else if (healthCheck.status === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }

    // Set cache headers (short cache for health checks)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(httpStatus).json(healthCheck);

  } catch (error) {
    console.error('Error in /api/health:', error);
    
    // Return unhealthy status with error details
    const errorResponse = {
      ...healthCheck,
      status: 'unhealthy',
      error: {
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };

    return res.status(503).json(errorResponse);
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}