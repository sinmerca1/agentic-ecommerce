import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { OllamaError } from '../utils/errors';

class OllamaService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.OLLAMA_BASE_URL,
      timeout: 60000,
    });
  }

  async initialize(): Promise<void> {
    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models || [];
      logger.info('Available Ollama models:', models.map((m: any) => m.name));

      // Note: Models may not be loaded yet when Ollama starts up
      // The app will work fine - models will be loaded on first request
      logger.info('Ollama service initialized successfully');
    } catch (error) {
      throw new OllamaError(
        `Failed to initialize Ollama: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const response = await this.client.post('/api/generate', {
        model: config.OLLAMA_MODEL,
        prompt,
        system: systemPrompt,
        temperature,
        stream: false,
      });

      return response.data.response || '';
    } catch (error) {
      throw new OllamaError(
        `Failed to generate text: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.post('/api/embeddings', {
        model: config.OLLAMA_EMBED_MODEL,
        prompt: text,
      });

      return response.data.embedding || [];
    } catch (error) {
      throw new OllamaError(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string,
    temperature: number = 0.7
  ): Promise<string> {
    try {
      const allMessages = systemPrompt
        ? [
            { role: 'system', content: systemPrompt },
            ...messages,
          ]
        : messages;

      const response = await this.client.post('/api/chat', {
        model: config.OLLAMA_MODEL,
        messages: allMessages,
        temperature,
        stream: false,
      });

      return response.data.message?.content || '';
    } catch (error) {
      throw new OllamaError(
        `Failed to chat: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export const ollamaService = new OllamaService();
