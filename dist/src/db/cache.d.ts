import { Settings, TickData } from './types';
/**
 * In-memory cache manager for performance optimization
 * Caches latest tick data and settings to reduce database queries
 */
export declare class CacheManager {
    private latestTick;
    private settings;
    private lastTickUpdate;
    private lastSettingsUpdate;
    private readonly TICK_TTL;
    private readonly SETTINGS_TTL;
    /**
     * Get the latest cached tick data
     * @returns Latest tick data or null if not cached or expired
     */
    getLatestTick(): TickData | null;
    /**
     * Set the latest tick data in cache
     * @param tick - Tick data to cache
     */
    setLatestTick(tick: TickData): void;
    /**
     * Get cached settings data
     * @returns Settings data or null if not cached or expired
     */
    getSettings(): Settings | null;
    /**
     * Set settings data in cache
     * @param settings - Settings data to cache
     */
    setSettings(settings: Settings): void;
    /**
     * Invalidate cached settings (force refresh on next access)
     */
    invalidateSettings(): void;
    /**
     * Invalidate cached tick data (force refresh on next access)
     */
    invalidateTick(): void;
    /**
     * Clear all cached data
     */
    clear(): void;
    /**
     * Warm the cache with initial data
     * @param tick - Initial tick data
     * @param settings - Initial settings data
     */
    warm(tick: TickData | null, settings: Settings | null): void;
    /**
     * Get cache statistics for monitoring
     */
    getStats(): {
        hasLatestTick: boolean;
        hasSettings: boolean;
        tickAge: number;
        settingsAge: number;
        isTickExpired: boolean;
        isSettingsExpired: boolean;
    };
    /**
     * Check if tick data is expired
     */
    private isTickExpired;
    /**
     * Check if settings data is expired
     */
    private isSettingsExpired;
}
export declare const cacheManager: CacheManager;
