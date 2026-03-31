import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Elasticsearch
  ELASTICSEARCH_HOST: z.string().default('localhost'),
  ELASTICSEARCH_PORT: z.coerce.number().default(9200),

  // Ollama
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2:3b'),
  OLLAMA_EMBED_MODEL: z.string().default('nomic-embed-text'),

  // SMTP
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string().default('noreply@agentic-ecommerce.local'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;
