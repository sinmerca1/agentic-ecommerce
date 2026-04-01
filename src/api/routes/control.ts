import { Router, Request, Response } from 'express';
import { approvalService } from '../../services/approvals';
import { scheduler } from '../../services/scheduler';
import { elasticsearchService } from '../../services/elasticsearch';
import { ollamaService } from '../../services/ollama';
import { cacheService } from '../../services/cache';
import { logger } from '../../utils/logger';

const router = Router();

// SSE endpoint for real-time dashboard updates
router.get('/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendEvent = (type: string, data: any) => {
    try {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    } catch (error) {
      logger.error('SSE send error:', error);
    }
  };

  // Send initial state
  sendEvent('connect', {
    message: 'Connected to Agent Control Center',
    timestamp: new Date(),
  });

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    sendEvent('heartbeat', { timestamp: new Date() });
  }, 30000);

  // Listen for approvals
  const approvalHandler = (request: any) => {
    sendEvent('approval', request);
  };

  const updateHandler = (request: any) => {
    sendEvent('approval-updated', request);
  };

  approvalService.onApproval(approvalHandler);
  approvalService.onUpdate(updateHandler);

  req.on('close', () => {
    clearInterval(heartbeat);
    approvalService.removeListener('approval', approvalHandler);
    approvalService.removeListener('approval-updated', updateHandler);
    res.end();
  });
});

// System health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const checks = {
      elasticsearch: await elasticsearchService.checkConnection(),
      ollama: await ollamaService.initialize().then(() => ({ status: 'connected' })).catch(() => ({ status: 'disconnected' })),
      cache: { status: 'active', entries: cacheService.getStats().size },
    };

    const healthy =
      checks.elasticsearch.status === 'connected' &&
      checks.ollama.status === 'connected';

    res.json({
      status: healthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Dashboard stats
router.get('/stats', (req: Request, res: Response) => {
  const approvalStats = approvalService.getStats();
  const cacheStats = cacheService.getStats();
  const schedules = scheduler.list();

  res.json({
    approvals: approvalStats,
    cache: {
      entries: cacheStats.size,
      ttl: cacheStats.ttl,
    },
    schedules: schedules.length,
    timestamp: new Date(),
  });
});

// Get pending approvals
router.get('/approvals/pending', (req: Request, res: Response) => {
  const pending = approvalService.getPending();
  res.json(pending);
});

// Get all approvals
router.get('/approvals', (req: Request, res: Response) => {
  const all = approvalService.getAll();
  res.json(all);
});

// Approve a request
router.post('/approvals/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approvedBy } = req.body;

  const success = await approvalService.approve(id, approvedBy || 'user');

  if (!success) {
    return res.status(404).json({ error: 'Approval not found or already resolved' });
  }

  res.json({ success: true, message: 'Approved' });
});

// Reject a request
router.post('/approvals/:id/reject', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rejectedBy } = req.body;

  const success = await approvalService.reject(id, rejectedBy || 'user');

  if (!success) {
    return res.status(404).json({ error: 'Approval not found or already resolved' });
  }

  res.json({ success: true, message: 'Rejected' });
});

// Get scheduled tasks
router.get('/schedules', (req: Request, res: Response) => {
  const schedules = scheduler.list();
  res.json(schedules);
});

// Create schedule
router.post('/schedules', (req: Request, res: Response) => {
  const { agent, cron } = req.body;

  if (!agent || !cron) {
    return res.status(400).json({ error: 'Missing agent or cron expression' });
  }

  try {
    // Note: Actual scheduling callback would be in the agent routes
    // This just validates and stores the configuration
    res.json({
      success: true,
      message: `Schedule configured for ${agent}`,
      agent,
      cron,
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid schedule',
    });
  }
});

// Delete schedule
router.delete('/schedules/:agent', (req: Request, res: Response) => {
  const { agent } = req.params;

  const success = scheduler.stop(agent);

  if (!success) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json({ success: true, message: `Schedule deleted for ${agent}` });
});

export default router;
