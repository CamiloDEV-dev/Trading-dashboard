"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedDatabaseClient = void 0;
/**
 * Cache-aware database client wrapper that uses CacheManager for performance optimization
 * This demonstrates how the cache manager integrates with database operations
 */
class CachedDatabaseClient {
    databaseClient;
    cacheManager;
    constructor(databaseClient, cacheManager) {
        this.databaseClient = databaseClient;
        this.cacheManager = cacheManager;
    }
    /**
     * Get latest settings with caching
     */
    async getLatestSettings(runId) {
        // Try cache first
        const cachedSettings = this.cacheManager.getSettings();
        if (cachedSettings && (!runId || cachedSettings.run_id === runId)) {
            return cachedSettings;
        }
        // Fetch from database and cache result
        const settings = await this.databaseClient.getLatestSettings(runId);
        if (settings) {
            this.cacheManager.setSettings(settings);
        }
        return settings;
    }
    /**
     * Update settings and invalidate cache
     */
    async updateSettings(updates) {
        const updatedSettings = await this.databaseClient.updateSettings(updates);
        // Invalidate cache to force refresh on next access
        this.cacheManager.invalidateSettings();
        // Optionally cache the new settings immediately
        this.cacheManager.setSettings(updatedSettings);
        return updatedSettings;
    }
    /**
     * Get latest tick with caching
     */
    async getLatestTick(runId) {
        // Try cache first
        const cachedTick = this.cacheManager.getLatestTick();
        if (cachedTick && (!runId || cachedTick.run_id === runId)) {
            return cachedTick;
        }
        // Fetch from database and cache result
        const tick = await this.databaseClient.getLatestTick(runId);
        if (tick) {
            this.cacheManager.setLatestTick(tick);
        }
        return tick;
    }
    /**
     * Batch insert ticks and update cache with latest
     */
    async batchInsertTicks(ticks) {
        await this.databaseClient.batchInsertTicks(ticks);
        // Cache the most recent tick
        if (ticks.length > 0) {
            const latestTick = ticks[ticks.length - 1];
            this.cacheManager.setLatestTick(latestTick);
        }
    }
    /**
     * Warm cache on application startup
     */
    async warmCache(runId) {
        try {
            // Use Promise.allSettled to handle partial failures
            const [tickResult, settingsResult] = await Promise.allSettled([
                this.databaseClient.getLatestTick(runId),
                this.databaseClient.getLatestSettings(runId)
            ]);
            const latestTick = tickResult.status === 'fulfilled' ? tickResult.value : null;
            const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
            this.cacheManager.warm(latestTick, settings);
            // Log any failures for debugging
            if (tickResult.status === 'rejected') {
                console.warn('Failed to warm tick cache:', tickResult.reason);
            }
            if (settingsResult.status === 'rejected') {
                console.warn('Failed to warm settings cache:', settingsResult.reason);
            }
        }
        catch (error) {
            console.warn('Failed to warm cache:', error);
            // Don't throw - cache warming is optional
        }
    }
    // Delegate other methods without caching (they're less frequently accessed)
    async getAggregates(interval, runId, limit) {
        return this.databaseClient.getAggregates(interval, runId, limit);
    }
    async insertAggregates(aggregates) {
        return this.databaseClient.insertAggregates(aggregates);
    }
    async logUserAction(action) {
        return this.databaseClient.logUserAction(action);
    }
    async getUserActions(runId, limit) {
        return this.databaseClient.getUserActions(runId, limit);
    }
    async testConnection() {
        return this.databaseClient.testConnection();
    }
    async initializeDefaultSettings(runId) {
        const settings = await this.databaseClient.initializeDefaultSettings(runId);
        // Cache the newly created settings
        this.cacheManager.setSettings(settings);
        return settings;
    }
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats() {
        return this.cacheManager.getStats();
    }
    /**
     * Clear cache (useful for testing or manual cache invalidation)
     */
    clearCache() {
        this.cacheManager.clear();
    }
}
exports.CachedDatabaseClient = CachedDatabaseClient;
