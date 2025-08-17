import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '../src/db/supabase';
import { CachedDatabaseClient } from '../src/db/cached-client';
import { cacheManager } from '../src/db/cache';
import { securityMiddleware } from '../src/middleware/security';
import { validateTargetPricePayload, formatValidationError } from '../src/middleware/validation';

/**
 * POST /api/target - Update target price for portfolio simulation
 * 
 * Request body:
 * {
 *   "target_price": number
 * }
 * 
 * - Validates target_price payload structure and numeric range
 * - Updates settings table and recalculates bounds
 * - Logs user action in user_actions table
 * - Invalidates cache after successful update
 * 
 * Requirements: 2.1, 2.4, 7.3
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
    const validation = validateTargetPricePayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json(formatValidationError(validation.errors));
    }

    const { target_price } = validation.sanitizedData;

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

    // Update settings with new target price
    const updatedSettings = await cachedClient.updateSettings({
      target_price: target_price,
      updated_at: new Date().toISOString()
    });

    // Log user action for audit trail
    await cachedClient.logUserAction({
      run_id: currentSettings.run_id,
      action_type: 'target_update',
      payload: {
        old_target_price: currentSettings.target_price,
        new_target_price: target_price,
        timestamp: new Date().toISOString()
      }
    });

    // Calculate new bounds (±5% of target)
    const bounds = {
      lower: target_price * 0.95,
      upper: target_price * 1.05
    };

    // Prepare success response
    const response = {
      success: true,
      message: 'Target price updated successfully',
      data: {
        target_price: updatedSettings.target_price,
        bounds: bounds,
        run_id: updatedSettings.run_id,
        updated_at: updatedSettings.updated_at
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in /api/target:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'DATABASE_ERROR'
    });
  }
}