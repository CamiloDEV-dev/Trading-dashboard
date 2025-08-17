"use strict";
/**
 * Example usage of the Supabase database client
 * This file demonstrates how to use the database client in your application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleUsage = exampleUsage;
const supabase_1 = require("./supabase");
async function exampleUsage() {
    // Create the database client using environment variables
    const db = (0, supabase_1.createSupabaseClient)();
    try {
        // Test the connection
        const isConnected = await db.testConnection();
        console.log('Database connected:', isConnected);
        // Initialize default settings for a new run
        const runId = `run-${Date.now()}`;
        const settings = await db.initializeDefaultSettings(runId);
        console.log('Initialized settings:', settings);
        // Get the latest settings
        const latestSettings = await db.getLatestSettings();
        console.log('Latest settings:', latestSettings);
        // Create some sample tick data
        const ticks = [
            {
                run_id: runId,
                timestamp: new Date().toISOString(),
                total_value: 100.0,
                part1_value: 50.0,
                part2_value: 50.0,
                target_price: 100.0
            },
            {
                run_id: runId,
                timestamp: new Date(Date.now() + 1000).toISOString(),
                total_value: 101.5,
                part1_value: 50.75,
                part2_value: 50.75,
                target_price: 100.0
            }
        ];
        // Batch insert ticks
        await db.batchInsertTicks(ticks);
        console.log('Inserted', ticks.length, 'ticks');
        // Get the latest tick
        const latestTick = await db.getLatestTick(runId);
        console.log('Latest tick:', latestTick);
        // Log a user action
        const userAction = {
            run_id: runId,
            action_type: 'target_update',
            payload: { target_price: 105.0 }
        };
        await db.logUserAction(userAction);
        console.log('Logged user action');
        // Get user actions for the run
        const actions = await db.getUserActions(runId, 10);
        console.log('User actions:', actions);
    }
    catch (error) {
        console.error('Database operation failed:', error);
    }
}
// Only run if this file is executed directly
if (require.main === module) {
    exampleUsage().catch(console.error);
}
