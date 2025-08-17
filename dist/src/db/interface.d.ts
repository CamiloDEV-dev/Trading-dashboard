import { Settings, TickData, AggregateData, UserAction, ChartInterval } from './types';
/**
 * Database interface for crypto portfolio backend operations
 */
export interface DatabaseClient {
    /**
     * Get the latest settings for the current or specified run
     */
    getLatestSettings(runId?: string): Promise<Settings | null>;
    /**
     * Update settings with partial data
     */
    updateSettings(updates: Partial<Settings>): Promise<Settings>;
    /**
     * Insert multiple ticks in a batch operation
     */
    batchInsertTicks(ticks: TickData[]): Promise<void>;
    /**
     * Get the latest tick data
     */
    getLatestTick(runId?: string): Promise<TickData | null>;
    /**
     * Get aggregated data for chart display
     */
    getAggregates(interval: ChartInterval, runId?: string, limit?: number): Promise<AggregateData[]>;
    /**
     * Insert aggregated data
     */
    insertAggregates(aggregates: AggregateData[]): Promise<void>;
    /**
     * Log a user action
     */
    logUserAction(action: Omit<UserAction, 'id' | 'timestamp'>): Promise<void>;
    /**
     * Get user actions for a run
     */
    getUserActions(runId: string, limit?: number): Promise<UserAction[]>;
    /**
     * Test database connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Initialize default settings if none exist
     */
    initializeDefaultSettings(runId: string): Promise<Settings>;
}
