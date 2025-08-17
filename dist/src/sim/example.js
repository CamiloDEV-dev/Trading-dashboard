"use strict";
/**
 * Example usage of the Simulator class
 * Demonstrates the bounded mean-reverting random walk behavior
 */
Object.defineProperty(exports, "__esModule", { value: true });
const simulator_js_1 = require("./simulator.js");
// Example simulation state
const initialState = {
    currentValue: 100,
    target: 100,
    bounds: { lower: 95, upper: 105 },
    splits: { part1: 0.6, part2: 0.4 },
    isRunning: true,
    runId: 'example-run-1',
};
// Create simulator with default configuration
const simulator = new simulator_js_1.Simulator(initialState);
console.log('Starting simulation with bounded mean-reverting random walk...');
console.log('Target:', initialState.target);
console.log('Bounds:', initialState.bounds);
console.log('Splits:', initialState.splits);
console.log('---');
// Generate 20 ticks to demonstrate behavior
for (let i = 0; i < 20; i++) {
    const tick = simulator.generateTick();
    console.log(`Tick ${i + 1}:`);
    console.log(`  Total Value: ${tick.total_value.toFixed(4)}`);
    console.log(`  Part 1 (60%): ${tick.part1_value.toFixed(4)}`);
    console.log(`  Part 2 (40%): ${tick.part2_value.toFixed(4)}`);
    console.log(`  % from Target: ${tick.pct_from_target.toFixed(2)}%`);
    console.log(`  Within Bounds: ${tick.total_value >= tick.bounds.lower && tick.total_value <= tick.bounds.upper}`);
    console.log('---');
}
// Demonstrate control functions
console.log('Pausing simulation...');
simulator.pause();
const pausedTick1 = simulator.generateTick();
const pausedTick2 = simulator.generateTick();
console.log('Paused tick 1 value:', pausedTick1.total_value.toFixed(4));
console.log('Paused tick 2 value:', pausedTick2.total_value.toFixed(4));
console.log('Values should be identical when paused:', pausedTick1.total_value === pausedTick2.total_value);
// Resume and reset
console.log('\nResuming simulation...');
simulator.resume();
console.log('\nResetting to target...');
simulator.reset();
const resetTick = simulator.generateTick();
console.log('Value after reset:', resetTick.total_value.toFixed(4));
console.log('Should be close to target:', Math.abs(resetTick.total_value - resetTick.target) < 1);
// Demonstrate target update
console.log('\nUpdating target to 200...');
simulator.updateTarget(200);
const newTargetTick = simulator.generateTick();
console.log('New target:', newTargetTick.target);
console.log('New bounds:', newTargetTick.bounds);
// Demonstrate splits update
console.log('\nUpdating splits to 70/30...');
simulator.updateSplits(0.7, 0.3);
const newSplitsTick = simulator.generateTick();
console.log('Part 1 (70%):', newSplitsTick.part1_value.toFixed(4));
console.log('Part 2 (30%):', newSplitsTick.part2_value.toFixed(4));
console.log('Sum equals total:', Math.abs((newSplitsTick.part1_value + newSplitsTick.part2_value) - newSplitsTick.total_value) < 0.0001);
