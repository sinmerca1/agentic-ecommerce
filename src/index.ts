import { config } from './config';
import { logger } from './utils/logger';
import { createApp } from './api';
import { elasticsearchService } from './services/elasticsearch';
import { ollamaService } from './services/ollama';
import { emailService } from './services/email';

async function bootstrap() {
  try {
    logger.info('Initializing Agentic E-Commerce API...');

    // Initialize Elasticsearch
    logger.info('Connecting to Elasticsearch...');
    await elasticsearchService.initialize();

    // Initialize Ollama
    logger.info('Connecting to Ollama...');
    try {
      await ollamaService.initialize();
    } catch (error) {
      logger.warn(`Ollama initialization failed, continuing without LLM support: ${error instanceof Error ? error.message : String(error)}`);
      // Continue without Ollama - it may be needed later or models may be downloaded
    }

    // Initialize Email service
    logger.info('Initializing Email service...');
    try {
      await emailService.initialize();
    } catch (error) {
      logger.warn(`Email service initialization failed, continuing without email support: ${error instanceof Error ? error.message : String(error)}`);
      // Continue without email - it may be needed later
    }

    // Create and start Express app
    const app = createApp();

    const PORT = config.PORT;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info('Available endpoints:');
      logger.info('  POST /api/agents/process - Route and process any request');
      logger.info('  POST /api/agents/route - Determine which agent should handle a query');
      logger.info('  POST /api/agents/pricing - Process pricing inquiries');
      logger.info('  POST /api/agents/inventory - Process inventory inquiries');
      logger.info('  POST /api/agents/support - Create support tickets');
      logger.info('  GET  /api/products/search - Search products');
      logger.info('  POST /api/products - Create product');
      logger.info('  GET  /api/support/tickets - Get support tickets');
      logger.info('  GET  /api/health - Health check');
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await elasticsearchService.close();
        logger.info('Server shut down');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await elasticsearchService.close();
        logger.info('Server shut down');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to bootstrap application:', error);
    process.exit(1);
  }
}

bootstrap();
