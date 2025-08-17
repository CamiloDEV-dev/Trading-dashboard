"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_1 = require("../src/db/supabase");
const cached_client_1 = require("../src/db/cached-client");
const cache_1 = require("../src/db/cache");
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
async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            code: 'METHOD_NOT_ALLOWED'
        });
    }
    try {
        // Validate request body structure
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({
                error: 'Invalid request body',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'Request body must be a valid JSON object'
                }
            });
        }
        const { target_price } = req.body;
        // Validate target_price field
        if (target_price === undefined || target_price === null) {
            return res.status(400).json({
                error: 'Missing target_price field',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'target_price is required'
                }
            });
        }
        // Validate target_price is a number
        if (typeof target_price !== 'number' || isNaN(target_price)) {
            return res.status(400).json({
                error: 'Invalid target_price type',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'target_price must be a valid number'
                }
            });
        }
        // Validate target_price range (must be positive and reasonable)
        if (target_price <= 0) {
            return res.status(400).json({
                error: 'Invalid target_price value',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'target_price must be greater than 0'
                }
            });
        }
        // Additional validation for reasonable range (e.g., between $0.01 and $1,000,000)
        if (target_price < 0.01 || target_price > 1000000) {
            return res.status(400).json({
                error: 'Target price out of range',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'target_price must be between $0.01 and $1,000,000'
                }
            });
        }
        // Initialize database client with cache
        const supabaseClient = new supabase_1.SupabaseClient();
        const cachedClient = new cached_client_1.CachedDatabaseClient(supabaseClient, cache_1.cacheManager);
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
    }
    catch (error) {
        console.error('Error in /api/target:', error);
        return res.status(500).json({
            error: 'Internal server error',
            code: 'DATABASE_ERROR'
        });
    }
}
