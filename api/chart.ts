import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '../src/db/supabase';
import { CachedDatabaseClient } from '../src/db/cached-client';
import { cacheManager } from '../src/db/cache';
import { ChartInterval } from '../src/db/types';
import { securityMiddleware } from '../src/middleware/security';
import { validateChartInterval, formatValidationError } from '../src/middleware/validation';

/**
 * GET /api/chart - Return historical chart data with interval support
 * 
 * Query parameters:
 * - interval: 'day' | 'week' | 'month' (required)
 * - limit: number of data points to return (optional, default: 100)
 * 
 * Returns OHLC aggregated data for total_value only (no per-part breakdown)
 * - day: 1-minute OHLC aggregates
 * - week: 1-hour OHLC aggregates  
 * - month: 1-day OHLC aggregates
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
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
    // Extract and validate query parameters
    const { interval, limit } = req.query;
    
    // Validate interval parameter using security middleware
    const intervalValidation = validateChartInterval(interval);
    if (!intervalValidation.isValid) {
      return res.status(400).json(formatValidationError(intervalValidation.errors));
    }
    
    const validatedInterval = intervalValidation.sanitizedData.interval as ChartInterval;

    // Validate limit parameter if provided
    let limitNum = 100; // default
    if (limit) {
      if (typeof limit !== 'string' || isNaN(Number(limit))) {
        return res.status(400).json({
          error: 'Invalid limit parameter',
          code: 'VALIDATION_ERROR',
          details: {
            message: 'limit must be a valid number'
          }
        });
      }
      limitNum = Math.min(Math.max(1, Number(limit)), 1000); // clamp between 1-1000
    }

    // Initialize database client
    const supabaseClient = new SupabaseClient();
    const cachedClient = new CachedDatabaseClient(supabaseClient, cacheManager);

    // Get aggregated data for the specified interval
    const aggregates = await cachedClient.getAggregates(
      validatedInterval,
      undefined, // use current run_id
      limitNum
    );

    // Transform data to chart format (total_value only, no per-part breakdown)
    const chartData = aggregates.map(aggregate => ({
      timestamp: aggregate.bucket_start,
      open: aggregate.open_value,
      high: aggregate.high_value,
      low: aggregate.low_value,
      close: aggregate.close_value,
      tick_count: aggregate.tick_count
    }));

    // Prepare response metadata
    const response = {
      interval: validatedInterval,
      data_points: chartData.length,
      data: chartData,
      metadata: {
        interval_description: getIntervalDescription(validatedInterval),
        requested_limit: limitNum,
        actual_count: chartData.length
      }
    };

    // Set appropriate cache headers based on interval
    const cacheMaxAge = getCacheMaxAge(validatedInterval);
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 2}`);
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in /api/chart:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'DATABASE_ERROR'
    });
  }
}

/**
 * Get human-readable description for interval type
 */
function getIntervalDescription(interval: ChartInterval): string {
  switch (interval) {
    case 'day':
      return '1-minute OHLC aggregates for daily view';
    case 'week':
      return '1-hour OHLC aggregates for weekly view';
    case 'month':
      return '1-day OHLC aggregates for monthly view';
    default:
      return 'Unknown interval';
  }
}

/**
 * Get appropriate cache max-age based on interval
 */
function getCacheMaxAge(interval: ChartInterval): number {
  switch (interval) {
    case 'day':
      return 60; // 1 minute cache for day view
    case 'week':
      return 300; // 5 minute cache for week view
    case 'month':
      return 900; // 15 minute cache for month view
    default:
      return 60;
  }
}