"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseDatabaseClient = void 0;
exports.createSupabaseClient = createSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Supabase database client implementation with retry logic and error handling
 */
class SupabaseDatabaseClient {
    client;
    maxRetries = 3;
    retryDelay = 1000; // 1 second
    constructor(supabaseUrl, serviceRoleKey) {
        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase URL and service role key are required');
        }
        this.client = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    /**
     * Execute a database operation with retry logic
     */
    async withRetry(operation, operationName) {
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === this.maxRetries) {
                    throw this.createDatabaseError(`${operationName} failed after ${this.maxRetries} attempts`, lastError);
                }
                // Wait before retrying
                await this.delay(this.retryDelay * attempt);
            }
        }
        throw lastError;
    }
    /**
     * Create a standardized database error
     */
    createDatabaseError(message, originalError) {
        const error = new Error(message);
        error.name = 'DatabaseError';
        error.code = originalError?.code;
        error.details = originalError?.details;
        error.hint = originalError?.hint;
        error.cause = originalError;
        return error;
    }
    /**
     * Delay utility for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async getLatestSettings(runId) {
        return this.withRetry(async () => {
            let query = this.client
                .from('settings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1);
            if (runId) {
                query = query.eq('run_id', runId);
            }
            const { data, error } = await query.single();
            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null;
                }
                throw error;
            }
            return data;
        }, 'getLatestSettings');
    }
    async updateSettings(updates) {
        return this.withRetry(async () => {
            // First get the current settings to update
            const current = await this.getLatestSettings(updates.run_id);
            if (!current) {
                throw new Error('No settings found to update');
            }
            const { data, error } = await this.client
                .from('settings')
                .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
                .eq('id', current.id)
                .select()
                .single();
            if (error) {
                throw error;
            }
            return data;
        }, 'updateSettings');
    }
    async batchInsertTicks(ticks) {
        if (ticks.length === 0) {
            return;
        }
        return this.withRetry(async () => {
            const { error } = await this.client
                .from('ticks')
                .insert(ticks);
            if (error) {
                throw error;
            }
        }, 'batchInsertTicks');
    }
    async getLatestTick(runId) {
        return this.withRetry(async () => {
            let query = this.client
                .from('ticks')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(1);
            if (runId) {
                query = query.eq('run_id', runId);
            }
            const { data, error } = await query.single();
            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned
                    return null;
                }
                throw error;
            }
            return data;
        }, 'getLatestTick');
    }
    async getAggregates(interval, runId, limit = 100) {
        return this.withRetry(async () => {
            // Map chart intervals to database interval types
            const intervalTypeMap = {
                'day': 'minute',
                'week': 'hour',
                'month': 'day'
            };
            let query = this.client
                .from('aggregates')
                .select('*')
                .eq('interval_type', intervalTypeMap[interval])
                .order('bucket_start', { ascending: true })
                .limit(limit);
            if (runId) {
                query = query.eq('run_id', runId);
            }
            const { data, error } = await query;
            if (error) {
                throw error;
            }
            return data || [];
        }, 'getAggregates');
    }
    async insertAggregates(aggregates) {
        if (aggregates.length === 0) {
            return;
        }
        return this.withRetry(async () => {
            const { error } = await this.client
                .from('aggregates')
                .insert(aggregates);
            if (error) {
                throw error;
            }
        }, 'insertAggregates');
    }
    async logUserAction(action) {
        return this.withRetry(async () => {
            const { error } = await this.client
                .from('user_actions')
                .insert({
                ...action,
                timestamp: new Date().toISOString()
            });
            if (error) {
                throw error;
            }
        }, 'logUserAction');
    }
    async getUserActions(runId, limit = 50) {
        return this.withRetry(async () => {
            const { data, error } = await this.client
                .from('user_actions')
                .select('*')
                .eq('run_id', runId)
                .order('timestamp', { ascending: false })
                .limit(limit);
            if (error) {
                throw error;
            }
            return data || [];
        }, 'getUserActions');
    }
    async testConnection() {
        try {
            const { error } = await this.client
                .from('settings')
                .select('count')
                .limit(1);
            return !error;
        }
        catch {
            return false;
        }
    }
    async initializeDefaultSettings(runId) {
        return this.withRetry(async () => {
            const defaultSettings = {
                run_id: runId,
                target_price: 100.0,
                split_part1: 0.5,
                split_part2: 0.5,
                is_paused: false
            };
            const { data, error } = await this.client
                .from('settings')
                .insert(defaultSettings)
                .select()
                .single();
            if (error) {
                throw error;
            }
            return data;
        }, 'initializeDefaultSettings');
    }
}
exports.SupabaseDatabaseClient = SupabaseDatabaseClient;
/**
 * Factory function to create a Supabase database client
 */
function createSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    return new SupabaseDatabaseClient(supabaseUrl, serviceRoleKey);
}
