import { DatabaseClient } from './interface';
import { CacheManager } from './cache';
import { Settings, TickData, AggregateData, UserAction, ChartInterval } from './types';
/**
 * Cache-aware database client wrapper that uses CacheManager for performance optimization
 * This demonstrates how the cache manager integrates with database operations
 */
export declare class CachedDatabaseClient implements DatabaseClient {
    private databaseClient;
    private cacheManager;
    constructor(databaseClient: DatabaseClient, cacheManager: CacheManager);
    /**
     * Get latest settings with caching
     */
    getLatestSettings(runId?: string): Promise<Settings | null>;
    /**
     * Update settings and invalidate cache
     */
    updateSettings(updates: Partial<Settings>): Promise<Settings>;
    /**
     * Get latest tick with caching
     */
    getLatestTick(runId?: string): Promise<TickData | null>;
    /**
     * Batch insert ticks and update cache with latest
     */
    batchInsertTicks(ticks: TickData[]): Promise<void>;
    /**
     * Warm cache on application startup
     */
    warmCache(runId?: string): Promise<void>;
    getAggregates(interval: ChartInterval, runId?: string, limit?: number): Promise<AggregateData[]>;
    insertAggregates(aggregates: AggregateData[]): Promise<void>;
    logUserAction(action: Omit<UserAction, 'id' | 'timestamp'>): Promise<void>;
    getUserActions(runId: string, limit?: number): Promise<UserAction[]>;
    testConnection(): Promise<boolean>;
    initializeDefaultSettings(runId: string): Promise<Settings>;
    /**
     * Get cache statistics for monitoring
     */
    getCacheStats(): {
        hasLatestTick: boolean;
        hasSettings: boolean;
        tickAge: number;
        settingsAge: number;
        isTickExpired: boolean;
        isSettingsExpired: boolean;
    };
    /**
     * Clear cache (useful for testing or manual cache invalidation)
     */
    clearCache(): void;
}
