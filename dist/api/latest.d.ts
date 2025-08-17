import { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * GET /api/latest - Return current portfolio snapshot
 *
 * Returns current portfolio data including:
 * - total_value, part1_value, part2_value
 * - target, bounds, and percentage from target
 * - Uses cache for fast response times (<100ms)
 *
 * Requirements: 9.1, 10.1, 10.2
 */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<any>;
