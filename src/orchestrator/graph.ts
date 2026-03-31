import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';
import { AgentState, AgentRequest } from '../types';
import { PricingAgent } from '../agents/pricing';
import { InventoryAgent } from '../agents/inventory';
import { SupportAgent } from '../agents/support';

type AgentType = 'pricing' | 'inventory' | 'support';

export class AgentOrchestrator {
  private agents: Map<AgentType, any>;
  private executionHistory: Map<string, AgentState[]>;

  constructor() {
    this.agents = new Map([
      ['pricing', new PricingAgent()],
      ['inventory', new InventoryAgent()],
      ['support', new SupportAgent()],
    ]);

    this.executionHistory = new Map();
  }

  async processRequest(request: AgentRequest): Promise<AgentState> {
    const executionId = uuid();
    const history: AgentState[] = [];

    try {
      logger.info('Processing request:', {
        requestId: request.id,
        type: request.type,
        query: request.query,
      });

      // Initialize agent state
      let state: AgentState = {
        messages: [
          {
            id: uuid(),
            role: 'user',
            content: request.query,
            timestamp: new Date(),
            metadata: { requestId: request.id },
          },
        ],
        context: request.context,
        currentAgent: request.type,
        status: 'processing',
      };

      history.push(state);

      // Get the appropriate agent
      const agent = this.agents.get(request.type as AgentType);
      if (!agent) {
        throw new Error(`Unknown agent type: ${request.type}`);
      }

      // Process request through agent
      state = await agent.process(state);
      history.push(state);

      // Store execution history
      this.executionHistory.set(executionId, history);

      logger.info('Request processed successfully:', {
        requestId: request.id,
        status: state.status,
      });

      return state;
    } catch (error) {
      logger.error('Error processing request:', error);

      const errorState: AgentState = {
        messages: [
          {
            id: uuid(),
            role: 'assistant',
            content: `An error occurred while processing your request: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
          },
        ],
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };

      history.push(errorState);
      this.executionHistory.set(executionId, history);

      return errorState;
    }
  }

  async routeRequest(query: string): Promise<AgentType> {
    // Classify the incoming query to determine which agent should handle it
    const lowercaseQuery = query.toLowerCase();

    if (
      lowercaseQuery.includes('price') ||
      lowercaseQuery.includes('cost') ||
      lowercaseQuery.includes('how much') ||
      lowercaseQuery.includes('expensive')
    ) {
      return 'pricing';
    }

    if (
      lowercaseQuery.includes('stock') ||
      lowercaseQuery.includes('inventory') ||
      lowercaseQuery.includes('available') ||
      lowercaseQuery.includes('in stock')
    ) {
      return 'inventory';
    }

    if (
      lowercaseQuery.includes('help') ||
      lowercaseQuery.includes('problem') ||
      lowercaseQuery.includes('issue') ||
      lowercaseQuery.includes('support')
    ) {
      return 'support';
    }

    // Default to support for general inquiries
    return 'support';
  }

  getExecutionHistory(executionId: string): AgentState[] | undefined {
    return this.executionHistory.get(executionId);
  }

  clearHistory(executionId: string): void {
    this.executionHistory.delete(executionId);
  }
}

export const orchestrator = new AgentOrchestrator();
