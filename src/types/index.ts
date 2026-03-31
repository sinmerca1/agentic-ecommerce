import { z } from 'zod';

// Agent state types
export const AgentStateSchema = z.object({
  messages: z.array(z.any()),
  context: z.record(z.any()).optional(),
  currentAgent: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'error']).default('pending'),
  error: z.string().optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

// Message types
export const MessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Product types
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  price: z.number().positive(),
  stock: z.number().nonnegative(),
  sku: z.string(),
  category: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;

// Support ticket types
export const SupportTicketSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string(),
  subject: z.string(),
  description: z.string(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  createdAt: z.date(),
  updatedAt: z.date(),
  resolvedAt: z.date().optional(),
});

export type SupportTicket = z.infer<typeof SupportTicketSchema>;

// Agent request types
export const AgentRequestSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['pricing', 'inventory', 'support']),
  query: z.string(),
  context: z.record(z.any()).optional(),
  userId: z.string().optional(),
});

export type AgentRequest = z.infer<typeof AgentRequestSchema>;

// Agent response types
export const AgentResponseSchema = z.object({
  requestId: z.string().uuid(),
  response: z.string(),
  actionTaken: z.array(z.any()),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Email notification types
export const EmailNotificationSchema = z.object({
  id: z.string().uuid(),
  to: z.string().email(),
  subject: z.string(),
  template: z.string(),
  data: z.record(z.any()),
  sentAt: z.date().optional(),
  status: z.enum(['pending', 'sent', 'failed']).default('pending'),
});

export type EmailNotification = z.infer<typeof EmailNotificationSchema>;
