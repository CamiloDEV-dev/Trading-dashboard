/**
 * Database types for the crypto portfolio backend
 */
export interface Settings {
    id: string;
    run_id: string;
    target_price: number;
    split_part1: number;
    split_part2: number;
    is_paused: boolean;
    created_at: string;
    updated_at: string;
}
export interface TickData {
    id?: string;
    run_id: string;
    timestamp: string;
    total_value: number;
    part1_value: number;
    part2_value: number;
    target_price: number;
    created_at?: string;
}
export interface AggregateData {
    id?: string;
    run_id: string;
    interval_type: 'minute' | 'hour' | 'day';
    bucket_start: string;
    bucket_end: string;
    open_value: number;
    high_value: number;
    low_value: number;
    close_value: number;
    tick_count: number;
    created_at?: string;
}
export interface UserAction {
    id?: string;
    run_id: string;
    action_type: 'target_update' | 'split_update' | 'control_action';
    payload: Record<string, any>;
    timestamp?: string;
}
export interface Database {
    public: {
        Tables: {
            settings: {
                Row: Settings;
                Insert: Omit<Settings, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Settings, 'id' | 'created_at'>>;
            };
            ticks: {
                Row: TickData;
                Insert: Omit<TickData, 'id' | 'created_at'>;
                Update: Partial<Omit<TickData, 'id' | 'created_at'>>;
            };
            aggregates: {
                Row: AggregateData;
                Insert: Omit<AggregateData, 'id' | 'created_at'>;
                Update: Partial<Omit<AggregateData, 'id' | 'created_at'>>;
            };
            user_actions: {
                Row: UserAction;
                Insert: Omit<UserAction, 'id' | 'timestamp'>;
                Update: Partial<Omit<UserAction, 'id' | 'timestamp'>>;
            };
        };
    };
}
export type ChartInterval = 'day' | 'week' | 'month';
export interface DatabaseError extends Error {
    code?: string;
    details?: string;
    hint?: string;
}
