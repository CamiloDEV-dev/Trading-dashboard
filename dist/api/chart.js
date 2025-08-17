"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const supabase_1 = require("../src/db/supabase");
const cached_client_1 = require("../src/db/cached-client");
const cache_1 = require("../src/db/cache");
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
async function handler(req, res) {
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
        // Validate interval parameter
        const validIntervals = ['day', 'week', 'month'];
        if (!interval || typeof interval !== 'string' || !validIntervals.includes(interval)) {
            return res.status(400).json({
                error: 'Invalid interval parameter',
                code: 'VALIDATION_ERROR',
                details: {
                    message: 'interval must be one of: day, week, month',
                    validValues: validIntervals
                }
            });
        }
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
        const supabaseClient = new supabase_1.SupabaseClient();
        const cachedClient = new cached_client_1.CachedDatabaseClient(supabaseClient, cache_1.cacheManager);
        // Get aggregated data for the specified interval
        const aggregates = await cachedClient.getAggregates(interval, undefined, // use current run_id
        limitNum);
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
            interval: interval,
            data_points: chartData.length,
            data: chartData,
            metadata: {
                interval_description: getIntervalDescription(interval),
                requested_limit: limitNum,
                actual_count: chartData.length
            }
        };
        // Set appropriate cache headers based on interval
        const cacheMaxAge = getCacheMaxAge(interval);
        res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}, stale-while-revalidate=${cacheMaxAge * 2}`);
        return res.status(200).json(response);
    }
    catch (error) {
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
function getIntervalDescription(interval) {
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
function getCacheMaxAge(interval) {
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
