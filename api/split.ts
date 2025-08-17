import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '../src/db/supabase';
import { CachedDatabaseClient } from '../src/db/cached-client';
import { cacheManager } from '../src/db/cache';
import { securityMiddleware } from '../src/middleware/security';
import { validateSplitPayload, formatValidationError } from '../src/middleware/validation';

/**
 * POST /api/split - Update portfolio split allocation
 * 
 * Request body:
 * {
 *   "split_part1": number,
 *   "split_part2": number
 * }
 * 
 * - Validates that split_part1 + split_part2 = 1
 * - Updates settings table with new splits
 * - Logs user action and invalidates cache
 * - Returns validation error for invalid splits
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED' 
    });
  }

  try {
    // Validate and sanitize request payload
    const validation = validateSplitPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json(formatValidationError(validation.errors));
    }

    const { split_part1, split_part2 } = validation.sanitizedData;
    const tolerance = 0.0001; // For response validation info

    // Initialize database client with cache
    const supabaseClient = new SupabaseClient();
    const cachedClient = new CachedDatabaseClient(supabaseClient, cacheManager);

    // Get current settings to determine run_id
    const currentSettings = await cachedClient.getLatestSettings();
    if (!currentSettings) {
      return res.status(404).json({
        error: 'No settings found',
        code: 'NO_DATA_FOUND',
        details: {
          message: 'Unable to find current settings to update'
        }
      });
    }

    // Update settings with new splits
    const updatedSettings = await cachedClient.updateSettings({
      split_part1: split_part1,
      split_part2: split_part2,
      updated_at: new Date().toISOString()
    });

    // Log user action for audit trail
    await cachedClient.logUserAction({
      run_id: currentSettings.run_id,
      action_type: 'split_update',
      payload: {
        old_split_part1: currentSettings.split_part1,
        old_split_part2: currentSettings.split_part2,
        new_split_part1: split_part1,
        new_split_part2: split_part2,
        timestamp: new Date().toISOString()
      }
    });

    // Prepare success response
    const response = {
      success: true,
      message: 'Portfolio splits updated successfully',
      data: {
        split_part1: updatedSettings.split_part1,
        split_part2: updatedSettings.split_part2,
        run_id: updatedSettings.run_id,
        updated_at: updatedSettings.updated_at,
        validation: {
          sum: updatedSettings.split_part1 + updatedSettings.split_part2,
          is_valid: Math.abs((updatedSettings.split_part1 + updatedSettings.split_part2) - 1.0) <= tolerance
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in /api/split:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'DATABASE_ERROR'
    });
  }
}