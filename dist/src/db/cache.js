"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheManager = exports.CacheManager = void 0;
/**
 * In-memory cache manager for performance optimization
 * Caches latest tick data and settings to reduce database queries
 */
class CacheManager {
    latestTick = null;
    settings = null;
    lastTickUpdate = 0;
    lastSettingsUpdate = 0;
    // Cache TTL in milliseconds
    TICK_TTL = 2000; // 2 seconds
    SETTINGS_TTL = 30000; // 30 seconds
    /**
     * Get the latest cached tick data
     * @returns Latest tick data or null if not cached or expired
     */
    getLatestTick() {
        if (this.isTickExpired()) {
            this.latestTick = null;
            return null;
        }
        return this.latestTick;
    }
    /**
     * Set the latest tick data in cache
     * @param tick - Tick data to cache
     */
    setLatestTick(tick) {
        this.latestTick = tick;
        this.lastTickUpdate = Date.now();
    }
    /**
     * Get cached settings data
     * @returns Settings data or null if not cached or expired
     */
    getSettings() {
        if (this.isSettingsExpired()) {
            this.settings = null;
            return null;
        }
        return this.settings;
    }
    /**
     * Set settings data in cache
     * @param settings - Settings data to cache
     */
    setSettings(settings) {
        this.settings = settings;
        this.lastSettingsUpdate = Date.now();
    }
    /**
     * Invalidate cached settings (force refresh on next access)
     */
    invalidateSettings() {
        this.settings = null;
        this.lastSettingsUpdate = 0;
    }
    /**
     * Invalidate cached tick data (force refresh on next access)
     */
    invalidateTick() {
        this.latestTick = null;
        this.lastTickUpdate = 0;
    }
    /**
     * Clear all cached data
     */
    clear() {
        this.latestTick = null;
        this.settings = null;
        this.lastTickUpdate = 0;
        this.lastSettingsUpdate = 0;
    }
    /**
     * Warm the cache with initial data
     * @param tick - Initial tick data
     * @param settings - Initial settings data
     */
    warm(tick, settings) {
        if (tick) {
            this.setLatestTick(tick);
        }
        if (settings) {
            this.setSettings(settings);
        }
    }
    /**
     * Get cache statistics for monitoring
     */
    getStats() {
        const now = Date.now();
        return {
            hasLatestTick: this.latestTick !== null,
            hasSettings: this.settings !== null,
            tickAge: this.lastTickUpdate > 0 ? now - this.lastTickUpdate : -1,
            settingsAge: this.lastSettingsUpdate > 0 ? now - this.lastSettingsUpdate : -1,
            isTickExpired: this.isTickExpired(),
            isSettingsExpired: this.isSettingsExpired(),
        };
    }
    /**
     * Check if tick data is expired
     */
    isTickExpired() {
        if (this.lastTickUpdate === 0)
            return true;
        return Date.now() - this.lastTickUpdate > this.TICK_TTL;
    }
    /**
     * Check if settings data is expired
     */
    isSettingsExpired() {
        if (this.lastSettingsUpdate === 0)
            return true;
        return Date.now() - this.lastSettingsUpdate > this.SETTINGS_TTL;
    }
}
exports.CacheManager = CacheManager;
// Global cache instance
exports.cacheManager = new CacheManager();
