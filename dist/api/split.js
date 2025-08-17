"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_1 = require("../src/db/supabase");
const cached_client_1 = require("../src/db/cached-client");
const cache_1 = require("../src/db/cache");
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
        const { split_part1, split_part2 } = req.body;
        // Validate required fields
        if (split_part1 === undefined || split_part1 === null) {
            return res.status(400).json({
                error: 'Missing split_part1 field',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'split_part1 is required'
                }
            });
        }
        if (split_part2 === undefined || split_part2 === null) {
            return res.status(400).json({
                error: 'Missing split_part2 field',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'split_part2 is required'
                }
            });
        }
        // Validate split values are numbers
        if (typeof split_part1 !== 'number' || isNaN(split_part1)) {
            return res.status(400).json({
                error: 'Invalid split_part1 type',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'split_part1 must be a valid number'
                }
            });
        }
        if (typeof split_part2 !== 'number' || isNaN(split_part2)) {
            return res.status(400).json({
                error: 'Invalid split_part2 type',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'split_part2 must be a valid number'
                }
            });
        }
        // Validate split values are within valid range (0 to 1)
        if (split_part1 < 0 || split_part1 > 1) {
            return res.status(400).json({
                error: 'Invalid split_part1 range',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'split_part1 must be between 0 and 1'
                }
            });
        }
        if (split_part2 < 0 || split_part2 > 1) {
            return res.status(400).json({
                error: 'Invalid split_part2 range',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'split_part2 must be between 0 and 1'
                }
            });
        }
        // Validate that splits sum to 1 (with small tolerance for floating point precision)
        const splitSum = split_part1 + split_part2;
        const tolerance = 0.0001; // Allow small floating point errors
        if (Math.abs(splitSum - 1.0) > tolerance) {
            return res.status(400).json({
                error: 'Invalid split allocation',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'split_part1 + split_part2 must equal 1.0',
                    current_sum: splitSum,
                    split_part1: split_part1,
                    split_part2: split_part2
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
    }
    catch (error) {
        console.error('Error in /api/split:', error);
        return res.status(500).json({
            error: 'Internal server error',
            code: 'DATABASE_ERROR'
        });
    }
}
