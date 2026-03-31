import { v4 as uuid } from 'uuid';
import { logger, createChild } from '../utils/logger';
import { AgentState, Message } from '../types';
import { ollamaService } from '../services/ollama';

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
    const systemPrompt = this.systemPrompt();
    const conversationContext = this.formatContext(context);

    try {
      const response = await ollamaService.generateText(
        userMessage,
        systemPrompt,
        0.7
      );
      return response.trim();
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