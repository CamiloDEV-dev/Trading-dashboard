import { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * POST /api/split - Update portfolio split allocation
 *
 * Request body:
 * {
 *   "split_part1": number,
 *   "split_part2": number
 * }
 *
 * - Validates that split_part1 + split_part2 = 1
 * - Updates settings table with new splits
 * - Logs user action and invalidates cache
 * - Returns validation error for invalid splits
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<any>;
