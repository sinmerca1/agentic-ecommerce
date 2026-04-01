import { v4 as uuid } from 'uuid';
import { logger, createChild } from '../utils/logger';
import { AgentState, Message } from '../types';
import { ollamaService } from '../services/ollama';
import { cacheService } from '../services/cache';

export abstract class BaseAgent {
  protected agentId: string;
  protected logger = createChild({ agent: this.constructor.name });

  constructor(protected name: string) {
    this.agentId = uuid();
  }

  abstract systemPrompt(): string;
  abstract process(state: AgentState): Promise<AgentState>;

  protected async generateResponse(
    userMessage: string,
    context: Record<string, any> = {}
  ): Promise<string> {
    // Check cache first
    const cachedResponse = cacheService.get(userMessage, context);
    if (cachedResponse) {
      this.logger.info('Cache hit for query:', { query: userMessage });
      return cachedResponse;
    }

    const systemPrompt = this.systemPrompt();
    const conversationContext = this.formatContext(context);

    // Combine system prompt with context
    const fullSystemPrompt = conversationContext
      ? `${systemPrompt}\n\n${conversationContext}`
      : systemPrompt;

    try {
      const response = await ollamaService.generateText(
        userMessage,
        fullSystemPrompt,
        0.3
      );
      const trimmedResponse = response.trim();

      // Cache the response
      cacheService.set(userMessage, context, trimmedResponse);

      return trimmedResponse;
    } catch (error) {
      this.logger.error('Failed to generate response:', error);
      throw error;
    }
  }

  protected formatContext(context: Record<string, any>): string {
    if (Object.keys(context).length === 0) {
      return '';
    }

    return `Context:\n${Object.entries(context)
      .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
      .join('\n')}`;
  }

  protected addMessage(
    state: AgentState,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): AgentState {
    const message: Message = {
      id: uuid(),
      role,
      content,
      timestamp: new Date(),
      metadata: { agent: this.name },
    };

    return {
      ...state,
      messages: [...state.messages, message],
    };
  }

  protected getLastUserMessage(state: AgentState): string | null {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].role === 'user') {
        return state.messages[i].content;
      }
    }
    return null;
  }
}