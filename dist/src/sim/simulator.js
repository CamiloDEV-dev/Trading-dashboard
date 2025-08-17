"use strict";
/**
 * Simulation engine with bounded mean-reverting random walk
 * Implements requirements 1.1-1.6 for real-time price simulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Simulator = void 0;
class Simulator {
    state;
    config;
    constructor(initialState, config = {}) {
        this.state = { ...initialState };
        this.config = {
            updateFrequencyMs: 1000, // 1 second updates (Requirement 1.1)
            volatility: 0.02, // 2% volatility
            meanReversionRate: 0.1, // k parameter for mean reversion
            bandWidth: 0.05, // ±5% bounds (Requirement 1.2)
            ...config,
        };
        // Calculate initial bounds
        this.updateBounds();
    }
    /**
     * Generate a new tick with bounded mean-reverting random walk
     * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
     */
    generateTick() {
        if (!this.state.isRunning) {
            // Return current state without changes if paused
            return this.getCurrentTickData();
        }
        // Calculate drift using mean reversion: k*(T - total_t) (Requirement 1.5)
        const drift = this.calculateDrift(this.state.currentValue, this.state.target);
        // Add Gaussian noise N(0, sigma) (Requirement 1.6)
        const noise = this.addNoise(this.config.volatility);
        // Calculate new value
        let newValue = this.state.currentValue + drift + noise;
        // Apply bounds reflection (Requirements 1.3, 1.4)
        newValue = this.reflect(newValue, this.state.bounds.lower, this.state.bounds.upper);
        // Update current value
        this.state.currentValue = newValue;
        return this.getCurrentTickData();
    }
    /**
     * Reflect price back into valid range when hitting bounds
     * Requirements: 1.3, 1.4
     */
    reflect(value, lower, upper) {
        if (value < lower) {
            // Reflect off lower bound (Requirement 1.3)
            return lower + (lower - value);
        }
        else if (value > upper) {
            // Reflect off upper bound (Requirement 1.4)
            return upper - (value - upper);
        }
        return value;
    }
    /**
     * Calculate mean reversion drift: k*(T - total_t)
     * Requirement: 1.5
     */
    calculateDrift(current, target) {
        return this.config.meanReversionRate * (target - current);
    }
    /**
     * Generate Gaussian noise N(0, sigma)
     * Requirement: 1.6
     */
    addNoise(volatility) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return z0 * volatility;
    }
    /**
     * Start the simulation
     */
    start() {
        this.state.isRunning = true;
    }
    /**
     * Pause the simulation
     */
    pause() {
        this.state.isRunning = false;
    }
    /**
     * Resume the simulation
     */
    resume() {
        this.state.isRunning = true;
    }
    /**
     * Reset simulation to target price with new run ID
     */
    reset(newRunId) {
        this.state.currentValue = this.state.target;
        this.state.isRunning = true;
        if (newRunId) {
            this.state.runId = newRunId;
        }
    }
    /**
     * Update target price and recalculate bounds
     */
    updateTarget(newTarget) {
        this.state.target = newTarget;
        this.updateBounds();
    }
    /**
     * Update portfolio splits
     */
    updateSplits(part1, part2) {
        if (Math.abs(part1 + part2 - 1) > 0.0001) {
            throw new Error('Portfolio splits must sum to 1');
        }
        this.state.splits = { part1, part2 };
    }
    /**
     * Get current simulation state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update bounds based on current target (±5%)
     */
    updateBounds() {
        this.state.bounds = {
            lower: this.state.target * (1 - this.config.bandWidth),
            upper: this.state.target * (1 + this.config.bandWidth),
        };
    }
    /**
     * Get current tick data without generating new tick
     */
    getCurrentTickData() {
        const totalValue = this.state.currentValue;
        const part1Value = totalValue * this.state.splits.part1;
        const part2Value = totalValue * this.state.splits.part2;
        const pctFromTarget = ((totalValue - this.state.target) / this.state.target) * 100;
        return {
            timestamp: new Date().toISOString(),
            total_value: totalValue,
            part1_value: part1Value,
            part2_value: part2Value,
            target: this.state.target,
            bounds: { ...this.state.bounds },
            pct_from_target: pctFromTarget,
        };
    }
    /**
     * Convert simulator tick result to database tick data
     */
    toTickData(tickResult) {
        return {
            run_id: this.state.runId,
            timestamp: tickResult.timestamp,
            total_value: tickResult.total_value,
            part1_value: tickResult.part1_value,
            part2_value: tickResult.part2_value,
            target_price: tickResult.target,
        };
    }
}
exports.Simulator = Simulator;
