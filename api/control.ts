import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseClient } from '../src/db/supabase';
import { CachedDatabaseClient } from '../src/db/cached-client';
import { cacheManager } from '../src/db/cache';
import { randomBytes } from 'crypto';
import { securityMiddleware } from '../src/middleware/security';
import { validateControlPayload, formatValidationError } from '../src/middleware/validation';

/**
 * POST /api/control - Simulation control actions
 * 
 * Request body:
 * {
 *   "action": "pause" | "resume" | "reset"
 * }
 * 
 * - Supports pause, resume, and reset actions
 * - Updates simulation state and logs user actions
 * - Handles reset by creating new run_id and resetting to target
 * - Returns error for invalid action types
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply security middleware with enhanced rate limiting for control endpoints
  const security = securityMiddleware({ 
    enableCors: true, 
    enableRateLimit: true, 
    rateLimitType: 'control' // Stricter rate limiting for control actions
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
    const validation = validateControlPayload(req.body);
    if (!validation.isValid) {
      return res.status(400).json(formatValidationError(validation.errors));
    }

    const { action } = validation.sanitizedData;

    // Initialize database client with cache
    const supabaseClient = new SupabaseClient();
    const cachedClient = new CachedDatabaseClient(supabaseClient, cacheManager);

    // Get current settings
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

    let updatedSettings;
    let actionPayload: Record<string, any> = {
      action: action,
      timestamp: new Date().toISOString(),
      previous_state: {
        is_paused: currentSettings.is_paused,
        run_id: currentSettings.run_id
      }
    };

    // Handle different control actions
    switch (action) {
      case 'pause':
        // Pause the simulation
        if (currentSettings.is_paused) {
          return res.status(400).json({
            error: 'Simulation is already paused',
            code: 'INVALID_STATE',
            details: {
              message: 'Cannot pause an already paused simulation',
              current_state: 'paused'
            }
          });
        }

        updatedSettings = await cachedClient.updateSettings({
          is_paused: true,
          updated_at: new Date().toISOString()
        });

        actionPayload.new_state = { is_paused: true };
        break;

      case 'resume':
        // Resume the simulation
        if (!currentSettings.is_paused) {
          return res.status(400).json({
            error: 'Simulation is already running',
            code: 'INVALID_STATE',
            details: {
              message: 'Cannot resume an already running simulation',
              current_state: 'running'
            }
          });
        }

        updatedSettings = await cachedClient.updateSettings({
          is_paused: false,
          updated_at: new Date().toISOString()
        });

        actionPayload.new_state = { is_paused: false };
        break;

      case 'reset':
        // Reset simulation: create new run_id and reset to target
        const newRunId = generateRunId();
        
        // Initialize new settings with current target and splits but new run_id
        updatedSettings = await cachedClient.initializeDefaultSettings(newRunId);
        
        // Update with current target and splits to maintain continuity
        updatedSettings = await cachedClient.updateSettings({
          target_price: currentSettings.target_price,
          split_part1: currentSettings.split_part1,
          split_part2: currentSettings.split_part2,
          is_paused: false, // Reset starts in running state
          updated_at: new Date().toISOString()
        });

        actionPayload.new_state = {
          run_id: newRunId,
          is_paused: false,
          reset_to_target: currentSettings.target_price
        };
        break;

      default:
        // This should never happen due to validation above, but included for completeness
        return res.status(400).json({
          error: 'Unsupported action',
          code: 'VALIDATION_ERROR'
        });
    }

    // Log user action for audit trail
    await cachedClient.logUserAction({
      run_id: action === 'reset' ? updatedSettings.run_id : currentSettings.run_id,
      action_type: 'control_action',
      payload: actionPayload
    });

    // Prepare success response
    const response = {
      success: true,
      message: `Simulation ${action} completed successfully`,
      data: {
        action: action,
        run_id: updatedSettings.run_id,
        is_paused: updatedSettings.is_paused,
        target_price: updatedSettings.target_price,
        splits: {
          part1: updatedSettings.split_part1,
          part2: updatedSettings.split_part2
        },
        updated_at: updatedSettings.updated_at,
        ...(action === 'reset' && {
          reset_info: {
            new_run_id: updatedSettings.run_id,
            previous_run_id: currentSettings.run_id
          }
        })
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in /api/control:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'DATABASE_ERROR'
    });
  }
}

/**
 * Generate a new run ID for simulation reset
 * Format: YYYYMMDD-HHMMSS-RANDOM
 */
function generateRunId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ''); // HHMMSS
  const randomStr = randomBytes(4).toString('hex'); // 8 char random string
  
  return `${dateStr}-${timeStr}-${randomStr}`;
}