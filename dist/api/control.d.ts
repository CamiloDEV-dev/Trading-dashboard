import { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * POST /api/control - Simulation control actions
 *
 * Request body:
 * {
 *   "action": "pause" | "resume" | "reset"
 * }
 *
 * - Supports pause, resume, and reset actions
 * - Updates simulation state and logs user actions
 * - Handles reset by creating new run_id and resetting to target
 * - Returns error for invalid action types
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<any>;
