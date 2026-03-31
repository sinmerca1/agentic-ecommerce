import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { orchestrator } from '../../orchestrator/graph';
import { AgentRequestSchema } from '../../types';
import { logger } from '../../utils/logger';
import { ValidationError } from '../../utils/errors';

const router = Router();

// Request validation schemas
const QuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  context: z.record(z.any()).optional(),
  userId: z.string().optional(),
});

const RoutingSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
});

// Process request through agent
router.post('/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = QuerySchema.parse(req.body);
    const agentType = await orchestrator.routeRequest(body.query);

    const request = AgentRequestSchema.parse({
      id: uuid(),
      type: agentType,
      query: body.query,
      context: body.context,
      userId: body.userId,
    });

    const state = await orchestrator.processRequest(request);

    res.json({
      success: true,
      requestId: request.id,
      agentType,
      status: state.status,
      response: state.messages[state.messages.length - 1]?.content || '',
      messages: state.messages,
      context: state.context,
    });
  } catch (error) {
    next(error);
  }
});

// Route a query to determine which agent should handle it
router.post('/route', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = RoutingSchema.parse(req.body);
    const agentType = await orchestrator.routeRequest(body.query);

    res.json({
      success: true,
      query: body.query,
      recommendedAgent: agentType,
    });
  } catch (error) {
    next(error);
  }
});

// Process pricing inquiry
router.post('/pricing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = QuerySchema.parse(req.body);

    const request = AgentRequestSchema.parse({
      id: uuid(),
      type: 'pricing',
      query: body.query,
      context: body.context,
      userId: body.userId,
    });

    const state = await orchestrator.processRequest(request);

    res.json({
      success: true,
      requestId: request.id,
      agentType: 'pricing',
      status: state.status,
      response: state.messages[state.messages.length - 1]?.content || '',
      messages: state.messages,
    });
  } catch (error) {
    next(error);
  }
});

// Process inventory inquiry
router.post('/inventory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = QuerySchema.parse(req.body);

    const request = AgentRequestSchema.parse({
      id: uuid(),
      type: 'inventory',
      query: body.query,
      context: body.context,
      userId: body.userId,
    });

    const state = await orchestrator.processRequest(request);

    res.json({
      success: true,
      requestId: request.id,
      agentType: 'inventory',
      status: state.status,
      response: state.messages[state.messages.length - 1]?.content || '',
      messages: state.messages,
    });
  } catch (error) {
    next(error);
  }
});

// Process support inquiry
router.post('/support', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = QuerySchema.parse(req.body);

    const request = AgentRequestSchema.parse({
      id: uuid(),
      type: 'support',
      query: body.query,
      context: body.context,
      userId: body.userId,
    });

    const state = await orchestrator.processRequest(request);

    res.json({
      success: true,
      requestId: request.id,
      agentType: 'support',
      status: state.status,
      response: state.messages[state.messages.length - 1]?.content || '',
      messages: state.messages,
      ticketId: state.context?.ticketId,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
