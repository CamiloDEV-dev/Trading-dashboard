/**
 * API endpoint for manual daily rotation
 * POST /api/rotation - Trigger daily rotation manually
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseClient } from '../src/db/supabase';
import { createDailyRotationJob } from '../src/jobs/rotation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const origin = process.env.ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Create database client and rotation job
    const db = createSupabaseClient();
    const rotationJob = createDailyRotationJob(db, { enabled: false }); // Disabled to prevent auto-scheduling

    // Perform manual rotation
    const result = await rotationJob.performRotation();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Daily rotation completed successfully',
        data: {
          newRunId: result.newRunId,
          previousRunId: result.previousRunId,
          carriedForwardSettings: result.carriedForwardSettings,
          executionTime: result.executionTime
        }
      });
    } else {
      return res.status(500).json({
        error: 'Daily rotation failed',
        code: 'ROTATION_ERROR',
        details: result.error
      });
    }

  } catch (error) {
    console.error('Rotation endpoint error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}