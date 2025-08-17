/**
 * Example usage of the CacheManager and CachedDatabaseClient
 * This demonstrates how to integrate caching into the application
 */
import { CachedDatabaseClient } from './cached-client';
export declare function createCachedDatabaseClient(): CachedDatabaseClient;
export declare function initializeApplication(): Promise<CachedDatabaseClient>;
export declare function getLatestPortfolioData(cachedClient: CachedDatabaseClient): Promise<{
    timestamp: string;
    total_value: number;
    part1_value: number;
    part2_value: number;
    target: number;
    bounds: {
        lower: number;
        upper: number;
    };
    pct_from_target: number;
    splits: {
        part1: number;
        part2: number;
    };
    is_paused: boolean;
}>;
export declare function updateTargetPrice(cachedClient: CachedDatabaseClient, newTarget: number, runId: string): Promise<import("./types").Settings>;
export declare function processTicks(cachedClient: CachedDatabaseClient, newTicks: Array<{
    run_id: string;
    timestamp: string;
    total_value: number;
    part1_value: number;
    part2_value: number;
    target_price: number;
}>): Promise<void>;
export declare function getSystemHealth(cachedClient: CachedDatabaseClient): Promise<{
    database_connected: boolean;
    cache: {
        has_latest_tick: boolean;
        has_settings: boolean;
        tick_age_ms: number;
        settings_age_ms: number;
        tick_expired: boolean;
        settings_expired: boolean;
    };
    uptime: number;
    memory_usage: NodeJS.MemoryUsage;
}>;
