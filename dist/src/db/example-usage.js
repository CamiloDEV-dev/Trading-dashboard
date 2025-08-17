"use strict";
/**
 * Example usage of the CacheManager and CachedDatabaseClient
 * This demonstrates how to integrate caching into the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCachedDatabaseClient = createCachedDatabaseClient;
exports.initializeApplication = initializeApplication;
exports.getLatestPortfolioData = getLatestPortfolioData;
exports.updateTargetPrice = updateTargetPrice;
exports.processTicks = processTicks;
exports.getSystemHealth = getSystemHealth;
const supabase_1 = require("./supabase");
const cached_client_1 = require("./cached-client");
const cache_1 = require("./cache");
// Example: Setting up the cached database client
function createCachedDatabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Create the base database client
    const databaseClient = new supabase_1.SupabaseDatabaseClient(supabaseUrl, serviceRoleKey);
    // Create a cache manager instance
    const cacheManager = new cache_1.CacheManager();
    // Create the cached wrapper
    const cachedClient = new cached_client_1.CachedDatabaseClient(databaseClient, cacheManager);
    return cachedClient;
}
// Example: Application startup with cache warming
async function initializeApplication() {
    const cachedClient = createCachedDatabaseClient();
    // Warm the cache on startup for better initial performance
    await cachedClient.warmCache();
    console.log('Cache warmed successfully');
    console.log('Cache stats:', cachedClient.getCacheStats());
    return cachedClient;
}
// Example: Using the cached client in API endpoints
async function getLatestPortfolioData(cachedClient) {
    // This will use cache if available, otherwise fetch from database
    const [latestTick, settings] = await Promise.all([
        cachedClient.getLatestTick(),
        cachedClient.getLatestSettings()
    ]);
    if (!latestTick || !settings) {
        throw new Error('Unable to fetch portfolio data');
    }
    return {
        timestamp: latestTick.timestamp,
        total_value: latestTick.total_value,
        part1_value: latestTick.part1_value,
        part2_value: latestTick.part2_value,
        target: settings.target_price,
        bounds: {
            lower: settings.target_price * 0.95,
            upper: settings.target_price * 1.05
        },
        pct_from_target: ((latestTick.total_value - settings.target_price) / settings.target_price) * 100,
        splits: {
            part1: settings.split_part1,
            part2: settings.split_part2
        },
        is_paused: settings.is_paused
    };
}
// Example: Updating settings with cache invalidation
async function updateTargetPrice(cachedClient, newTarget, runId) {
    // This will automatically invalidate and update the cache
    const updatedSettings = await cachedClient.updateSettings({
        target_price: newTarget,
        updated_at: new Date().toISOString()
    });
    // Log the action
    await cachedClient.logUserAction({
        run_id: runId,
        action_type: 'target_update',
        payload: { old_target: updatedSettings.target_price, new_target: newTarget }
    });
    return updatedSettings;
}
// Example: Batch processing with cache updates
async function processTicks(cachedClient, newTicks) {
    // This will automatically cache the latest tick
    await cachedClient.batchInsertTicks(newTicks);
    console.log('Processed', newTicks.length, 'ticks');
    console.log('Cache stats after processing:', cachedClient.getCacheStats());
}
// Example: Health check with cache information
async function getSystemHealth(cachedClient) {
    const cacheStats = cachedClient.getCacheStats();
    const dbConnected = await cachedClient.testConnection();
    return {
        database_connected: dbConnected,
        cache: {
            has_latest_tick: cacheStats.hasLatestTick,
            has_settings: cacheStats.hasSettings,
            tick_age_ms: cacheStats.tickAge,
            settings_age_ms: cacheStats.settingsAge,
            tick_expired: cacheStats.isTickExpired,
            settings_expired: cacheStats.isSettingsExpired
        },
        uptime: process.uptime(),
        memory_usage: process.memoryUsage()
    };
}
