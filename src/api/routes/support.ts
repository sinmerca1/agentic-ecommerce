import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { elasticsearchService } from '../../services/elasticsearch';
import { NotFoundError } from '../../utils/errors';

const router = Router();

const SearchSchema = z.object({
  customerId: z.string().optional(),
  status: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

// Get all tickets with optional filters
router.get('/tickets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = SearchSchema.parse(req.query);

    const tickets = await elasticsearchService.searchTickets(
      params.customerId,
      params.status,
      params.limit || 10
    );

    res.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    next(error);
  }
});

// Get ticket by ID
router.get('/tickets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await elasticsearchService.getTicket(req.params.id);

    if (!ticket) {
      throw new NotFoundError('Support ticket');
    }

    res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
});

// Update ticket
router.patch(
  '/tickets/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = UpdateTicketSchema.parse(req.body);

      const ticket = await elasticsearchService.getTicket(req.params.id);
      if (!ticket) {
        throw new NotFoundError('Support ticket');
      }

      await elasticsearchService.updateTicket(req.params.id, body);

      const updatedTicket = await elasticsearchService.getTicket(req.params.id);

      res.json({
        success: true,
        ticket: updatedTicket,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
