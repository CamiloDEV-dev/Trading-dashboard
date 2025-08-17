import { VercelRequest, VercelResponse } from '@vercel/node';
/**
 * GET /api/chart - Return historical chart data with interval support
 *
 * Query parameters:
 * - interval: 'day' | 'week' | 'month' (required)
 * - limit: number of data points to return (optional, default: 100)
 *
 * Returns OHLC aggregated data for total_value only (no per-part breakdown)
 * - day: 1-minute OHLC aggregates
 * - week: 1-hour OHLC aggregates
 * - month: 1-day OHLC aggregates
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export default function handler(req: VercelRequest, res: VercelResponse): Promise<any>;
