import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '../src/db/supabase';
import { CachedDatabaseClient } from '../src/db/cached-client';
import { cacheManager } from '../src/db/cache';
import { securityMiddleware } from '../src/middleware/security';

/**
 * GET /api/latest - Return current portfolio snapshot
 * 
 * Returns current portfolio data including:
 * - total_value, part1_value, part2_value
 * - target, bounds, and percentage from target
 * - Uses cache for fast response times (<100ms)
 * 
 * Requirements: 9.1, 10.1, 10.2
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

  try {
    // Initialize database client with cache
    const supabaseClient = new SupabaseClient();
    const cachedClient = new CachedDatabaseClient(supabaseClient, cacheManager);

    // Get latest tick and settings (using cache for performance)
    const [latestTick, settings] = await Promise.all([
      cachedClient.getLatestTick(),
      cachedClient.getLatestSettings()
    ]);

    if (!latestTick || !settings) {
      return res.status(404).json({
        error: 'No portfolio data available',
        code: 'NO_DATA_FOUND'
      });
    }

    // Calculate bounds (±5% of target)
    const target = settings.target_price;
    const bounds = {
      lower: target * 0.95,
      upper: target * 1.05
    };

    // Calculate percentage from target
    const pct_from_target = ((latestTick.total_value - target) / target) * 100;

    // Prepare response data
    const portfolioSnapshot = {
      timestamp: latestTick.timestamp,
      total_value: latestTick.total_value,
      part1_value: latestTick.part1_value,
      part2_value: latestTick.part2_value,
      target: target,
      bounds: bounds,
      pct_from_target: Number(pct_from_target.toFixed(4)),
      run_id: latestTick.run_id,
      is_paused: settings.is_paused,
      splits: {
        part1: settings.split_part1,
        part2: settings.split_part2
      }
    };

    // Set cache headers for performance
    res.setHeader('Cache-Control', 'public, max-age=1, stale-while-revalidate=2');
    
    return res.status(200).json(portfolioSnapshot);

  } catch (error) {
    console.error('Error in /api/latest:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'DATABASE_ERROR'
    });
  }
}