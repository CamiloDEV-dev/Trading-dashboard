import { VercelRequest, VercelResponse } from '@vercel/node';
import { SupabaseDatabaseClient } from '../src/db/supabase';
import { CachedDatabaseClient } from '../src/db/cached-client';
import { cacheManager } from '../src/db/cache';
import { Simulator, SimulationState } from '../src/sim/simulator';
import { securityMiddleware } from '../src/middleware/security';

/**
 * GET /api/stream - Server-Sent Events endpoint for real-time tick streaming
 * 
 * Provides real-time streaming of portfolio tick updates via SSE:
 * - Establishes SSE connection with proper headers
 * - Pushes tick updates every second with <300ms latency
 * - Handles client connections and disconnections gracefully
 * - Continues simulation in background even without connected clients
 * - Supports reconnection with proper CORS headers
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

// Global simulation state to persist across function calls
let globalSimulator: Simulator | null = null;
let simulationInterval: NodeJS.Timeout | null = null;
let connectedClients = new Set<VercelResponse>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply security middleware (CORS, rate limiting)
  const security = securityMiddleware({ 
    enableCors: true, 
    enableRateLimit: true, 
    rateLimitType: 'default' 
  });
  
  if (!security(req, res)) {
    return; // Security middleware handled the response
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED' 
    });
  }

  try {
    // Set SSE headers (Requirement 3.1)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // CORS headers for reconnection support (Requirement 3.5)
    const origin = process.env.ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Initialize database client
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }
    
    const supabaseClient = new SupabaseDatabaseClient(supabaseUrl, serviceRoleKey);
    const cachedClient = new CachedDatabaseClient(supabaseClient, cacheManager);

    // Initialize simulator if not already running
    if (!globalSimulator) {
      await initializeSimulator(cachedClient);
    }

    // Add client to connected clients set
    connectedClients.add(res);

    // Send initial connection event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ 
      message: 'Connected to portfolio stream',
      timestamp: new Date().toISOString(),
      clientCount: connectedClients.size
    })}\n\n`);

    // Send current tick immediately
    if (globalSimulator) {
      const currentTick = globalSimulator.generateTick();
      const tickData = formatTickForStream(currentTick);
      res.write(`event: tick\n`);
      res.write(`data: ${JSON.stringify(tickData)}\n\n`);
    }

    // Start simulation if not already running (Requirement 3.5 - background simulation)
    if (!simulationInterval) {
      startSimulation(cachedClient);
    }

    // Handle client disconnection (Requirement 3.4)
    req.on('close', () => {
      connectedClients.delete(res);
      console.log(`Client disconnected. Active clients: ${connectedClients.size}`);
      
      // Keep simulation running even if no clients connected (Requirement 3.5)
      if (connectedClients.size === 0) {
        console.log('No clients connected, but continuing simulation in background');
      }
    });

    req.on('error', (error: Error) => {
      console.error('SSE connection error:', error);
      connectedClients.delete(res);
    });

    // Keep connection alive
    const keepAlive = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(keepAlive);
        connectedClients.delete(res);
        return;
      }
      
      // Send heartbeat to prevent connection timeout
      res.write(`event: heartbeat\n`);
      res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, 30000); // Every 30 seconds

    // Clean up on connection end
    res.on('close', () => {
      clearInterval(keepAlive);
      connectedClients.delete(res);
    });

  } catch (error) {
    console.error('Error in /api/stream:', error);
    
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ORIGIN || '*'
    });
    
    return res.end(JSON.stringify({
      error: 'Internal server error',
      code: 'STREAM_ERROR'
    }));
  }
}

/**
 * Initialize the global simulator with current settings
 */
async function initializeSimulator(cachedClient: CachedDatabaseClient): Promise<void> {
  try {
    const settings = await cachedClient.getLatestSettings();
    const latestTick = await cachedClient.getLatestTick();

    if (!settings) {
      throw new Error('No settings found for simulation initialization');
    }

    // Create initial simulation state
    const initialState: SimulationState = {
      currentValue: latestTick?.total_value || settings.target_price,
      target: settings.target_price,
      bounds: {
        lower: settings.target_price * 0.95,
        upper: settings.target_price * 1.05
      },
      splits: {
        part1: settings.split_part1,
        part2: settings.split_part2
      },
      isRunning: !settings.is_paused,
      runId: settings.run_id
    };

    globalSimulator = new Simulator(initialState);
    console.log('Simulator initialized with state:', initialState);

  } catch (error) {
    console.error('Failed to initialize simulator:', error);
    throw error;
  }
}

/**
 * Start the simulation loop that generates ticks every second
 * Requirements: 3.2 - Push tick updates every second with <300ms latency
 */
function startSimulation(cachedClient: CachedDatabaseClient): void {
  if (simulationInterval) {
    return; // Already running
  }

  console.log('Starting simulation loop');
  
  simulationInterval = setInterval(async () => {
    if (!globalSimulator) {
      return;
    }

    try {
      const startTime = Date.now();
      
      // Generate new tick
      const tickResult = globalSimulator.generateTick();
      
      // Update cache with latest tick
      const tickData = globalSimulator.toTickData(tickResult);
      cacheManager.setLatestTick(tickData);
      
      // Batch write to database (will be handled by background process in task 8)
      // For now, we'll just update the cache
      
      // Format tick data for streaming
      const streamData = formatTickForStream(tickResult);
      
      // Broadcast to all connected clients (Requirement 3.2)
      const broadcastPromises = Array.from(connectedClients).map(client => {
        return new Promise<void>((resolve) => {
          try {
            if (!client.writableEnded) {
              client.write(`event: tick\n`);
              client.write(`data: ${JSON.stringify(streamData)}\n\n`);
            }
            resolve();
          } catch (error) {
            console.error('Error broadcasting to client:', error);
            connectedClients.delete(client);
            resolve();
          }
        });
      });
      
      await Promise.all(broadcastPromises);
      
      const latency = Date.now() - startTime;
      
      // Log performance metrics (should be <300ms per Requirement 3.2)
      if (latency > 300) {
        console.warn(`High latency detected: ${latency}ms`);
      }
      
      // Log every 10 seconds for monitoring
      if (Date.now() % 10000 < 1000) {
        console.log(`Simulation tick sent to ${connectedClients.size} clients in ${latency}ms`);
      }
      
    } catch (error) {
      console.error('Error in simulation loop:', error);
    }
  }, 1000); // 1 second intervals (Requirement 3.2)
}

/**
 * Format tick result for streaming to clients
 * Requirements: 3.3 - Include timestamp, total_value, part1_value, part2_value
 */
function formatTickForStream(tickResult: any) {
  return {
    timestamp: tickResult.timestamp,
    total_value: Number(tickResult.total_value.toFixed(8)),
    part1_value: Number(tickResult.part1_value.toFixed(8)),
    part2_value: Number(tickResult.part2_value.toFixed(8)),
    target: Number(tickResult.target.toFixed(8)),
    bounds: {
      lower: Number(tickResult.bounds.lower.toFixed(8)),
      upper: Number(tickResult.bounds.upper.toFixed(8))
    },
    pct_from_target: Number(tickResult.pct_from_target.toFixed(4)),
    client_count: connectedClients.size
  };
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  
  // Notify all connected clients
  connectedClients.forEach(client => {
    try {
      if (!client.writableEnded) {
        client.write(`event: shutdown\n`);
        client.write(`data: ${JSON.stringify({ message: 'Server shutting down' })}\n\n`);
        client.end();
      }
    } catch (error) {
      console.error('Error during shutdown notification:', error);
    }
  });
  
  connectedClients.clear();
});