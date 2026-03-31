export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class ValidationError extends AgentError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AgentError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ElasticsearchError extends AgentError {
  constructor(message: string) {
    super(message, 'ELASTICSEARCH_ERROR', 500);
    this.name = 'ElasticsearchError';
  }
}

export class OllamaError extends AgentError {
  constructor(message: string) {
    super(message, 'OLLAMA_ERROR', 503);
    this.name = 'OllamaError';
  }
}

export class EmailError extends AgentError {
  constructor(message: string) {
    super(message, 'EMAIL_ERROR', 500);
    this.name = 'EmailError';
  }
}
