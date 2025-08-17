/**
 * Simulation engine with bounded mean-reverting random walk
 * Implements requirements 1.1-1.6 for real-time price simulation
 */
import { TickData } from '../db/types.js';
export interface SimulationState {
    currentValue: number;
    target: number;
    bounds: {
        lower: number;
        upper: number;
    };
    splits: {
        part1: number;
        part2: number;
    };
    isRunning: boolean;
    runId: string;
}
export interface SimulationConfig {
    updateFrequencyMs: number;
    volatility: number;
    meanReversionRate: number;
    bandWidth: number;
}
export interface SimulatorTickResult {
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
}
export declare class Simulator {
    private state;
    private config;
    constructor(initialState: SimulationState, config?: Partial<SimulationConfig>);
    /**
     * Generate a new tick with bounded mean-reverting random walk
     * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
     */
    generateTick(): SimulatorTickResult;
    /**
     * Reflect price back into valid range when hitting bounds
     * Requirements: 1.3, 1.4
     */
    reflect(value: number, lower: number, upper: number): number;
    /**
     * Calculate mean reversion drift: k*(T - total_t)
     * Requirement: 1.5
     */
    calculateDrift(current: number, target: number): number;
    /**
     * Generate Gaussian noise N(0, sigma)
     * Requirement: 1.6
     */
    addNoise(volatility: number): number;
    /**
     * Start the simulation
     */
    start(): void;
    /**
     * Pause the simulation
     */
    pause(): void;
    /**
     * Resume the simulation
     */
    resume(): void;
    /**
     * Reset simulation to target price with new run ID
     */
    reset(newRunId?: string): void;
    /**
     * Update target price and recalculate bounds
     */
    updateTarget(newTarget: number): void;
    /**
     * Update portfolio splits
     */
    updateSplits(part1: number, part2: number): void;
    /**
     * Get current simulation state
     */
    getState(): SimulationState;
    /**
     * Get current configuration
     */
    getConfig(): SimulationConfig;
    /**
     * Update bounds based on current target (±5%)
     */
    private updateBounds;
    /**
     * Get current tick data without generating new tick
     */
    private getCurrentTickData;
    /**
     * Convert simulator tick result to database tick data
     */
    toTickData(tickResult: SimulatorTickResult): TickData;
}
