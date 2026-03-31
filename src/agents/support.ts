import { BaseAgent } from './base';
import { AgentState, SupportTicket } from '../types';
import { elasticsearchService } from '../services/elasticsearch';
import { emailService } from '../services/email';
import { v4 as uuid } from 'uuid';

export class SupportAgent extends BaseAgent {
  constructor() {
    super('SupportAgent');
  }

  systemPrompt(): string {
    return `You are a customer support specialist agent for an e-commerce platform.
Your responsibilities are:
1. Handle customer inquiries and support requests
2. Create and track support tickets
3. Provide timely and helpful responses to customer issues
4. Escalate complex issues appropriately
5. Follow up on unresolved tickets

When responding to support requests:
- Be empathetic and professional
- Provide clear and actionable solutions
- If you cannot resolve immediately, create a support ticket
- Always confirm ticket information with the customer
- Maintain a friendly and helpful tone`;
  }

  async process(state: AgentState): Promise<AgentState> {
    const lastMessage = this.getLastUserMessage(state);
    if (!lastMessage) {
      return {
        ...state,
        status: 'error',
        error: 'No user message found',
      };
    }

    try {
      this.logger.info('Processing support request:', { query: lastMessage });

      // Create a support ticket
      const ticket: SupportTicket = {
        id: uuid(),
        customerId: state.context?.customerId || 'unknown',
        subject: this.extractSubject(lastMessage),
        description: lastMessage,
        status: 'open',
        priority: this.determinePriority(lastMessage),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Index the ticket
      await elasticsearchService.indexTicket(ticket);

      const context = {
        ticketId: ticket.id,
        priority: ticket.priority,
        status: ticket.status,
      };

      // Generate support response
      const response = await this.generateResponse(lastMessage, context);

      let updatedState = this.addMessage(state, 'assistant', response);
      updatedState = {
        ...updatedState,
        status: 'completed',
        context: {
          ...state.context,
          ticketId: ticket.id,
        },
      };

      // Send ticket creation email
      if (state.context?.customerEmail) {
        try {
          await emailService.sendSupportTicketNotification(
            state.context.customerEmail,
            ticket.id,
            ticket.subject,
            ticket.priority
          );
        } catch (error) {
          this.logger.error('Failed to send support ticket email:', error);
        }
      }

      return updatedState;
    } catch (error) {
      this.logger.error('Support agent error:', error);
      return {
        ...state,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private extractSubject(message: string): string {
    // Extract first sentence as subject, max 100 chars
    const match = message.match(/[^.!?]+[.!?]/);
    const subject = match ? match[0].trim() : message.substring(0, 100);
    return subject.length > 100 ? subject.substring(0, 97) + '...' : subject;
  }

  private determinePriority(
    message: string
  ): 'low' | 'medium' | 'high' | 'urgent' {
    const lowercaseMsg = message.toLowerCase();

    if (
      lowercaseMsg.includes('urgent') ||
      lowercaseMsg.includes('asap') ||
      lowercaseMsg.includes('critical')
    ) {
      return 'urgent';
    }
    if (
      lowercaseMsg.includes('problem') ||
      lowercaseMsg.includes('issue') ||
      lowercaseMsg.includes('broken')
    ) {
      return 'high';
    }
    if (lowercaseMsg.includes('question') || lowercaseMsg.includes('help')) {
      return 'medium';
    }
    return 'low';
  }
}
