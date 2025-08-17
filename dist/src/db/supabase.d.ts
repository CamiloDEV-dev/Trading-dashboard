import { DatabaseClient } from './interface';
import { Settings, TickData, AggregateData, UserAction, ChartInterval } from './types';
/**
 * Supabase database client implementation with retry logic and error handling
 */
export declare class SupabaseDatabaseClient implements DatabaseClient {
    private client;
    private maxRetries;
    private retryDelay;
    constructor(supabaseUrl: string, serviceRoleKey: string);
    /**
     * Execute a database operation with retry logic
     */
    private withRetry;
    /**
     * Create a standardized database error
     */
    private createDatabaseError;
    /**
     * Delay utility for retry logic
     */
    private delay;
    getLatestSettings(runId?: string): Promise<Settings | null>;
    updateSettings(updates: Partial<Settings>): Promise<Settings>;
    batchInsertTicks(ticks: TickData[]): Promise<void>;
    getLatestTick(runId?: string): Promise<TickData | null>;
    getAggregates(interval: ChartInterval, runId?: string, limit?: number): Promise<AggregateData[]>;
    insertAggregates(aggregates: AggregateData[]): Promise<void>;
    logUserAction(action: Omit<UserAction, 'id' | 'timestamp'>): Promise<void>;
    getUserActions(runId: string, limit?: number): Promise<UserAction[]>;
    testConnection(): Promise<boolean>;
    initializeDefaultSettings(runId: string): Promise<Settings>;
}
/**
 * Factory function to create a Supabase database client
 */
export declare function createSupabaseClient(): SupabaseDatabaseClient;
