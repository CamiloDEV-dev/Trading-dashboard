/**
 * API endpoint for managing aggregation jobs
 * Supports manual job execution and status checking
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseClient } from '../src/db/supabase';
import { createAggregationScheduler } from '../src/jobs/scheduler';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const db = createSupabaseClient();
    const scheduler = createAggregationScheduler(db, { enabled: false }); // Don't auto-start

    if (req.method === 'GET') {
      // Get scheduler status
      const status = scheduler.getStatus();
      
      return res.status(200).json({
        status: 'success',
        data: {
          scheduler: status,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.method === 'POST') {
      const { action, jobType, runId } = req.body;

      if (!action) {
        return res.status(400).json({
          error: 'Missing required field: action',
          code: 'VALIDATION_ERROR'
        });
      }

      switch (action) {
        case 'run_job': {
          if (!jobType || !['minute', 'hour', 'day'].includes(jobType)) {
            return res.status(400).json({
              error: 'Invalid jobType. Must be one of: minute, hour, day',
              code: 'VALIDATION_ERROR'
            });
          }

          const result = await scheduler.runJob(jobType, runId);
          
          return res.status(200).json({
            status: 'success',
            data: {
              result,
              timestamp: new Date().toISOString()
            }
          });
        }

        case 'run_all_jobs': {
          const results = await scheduler.runAllJobs(runId);
          
          return res.status(200).json({
            status: 'success',
            data: {
              results,
              summary: {
                total: results.length,
                successful: results.filter(r => r.success).length,
                totalAggregates: results.reduce((sum, r) => sum + r.aggregatesCreated, 0)
              },
              timestamp: new Date().toISOString()
            }
          });
        }

        default:
          return res.status(400).json({
            error: `Invalid action: ${action}. Valid actions: run_job, run_all_jobs`,
            code: 'VALIDATION_ERROR'
          });
      }
    }

    return res.status(405).json({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });

  } catch (error) {
    console.error('Aggregation API error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}