import { Client } from 'elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ElasticsearchError } from '../utils/errors';
import { Product, SupportTicket } from '../types';

class ElasticsearchService {
  private client: Client;

  constructor() {
    this.client = new Client({
      hosts: [`${config.ELASTICSEARCH_HOST}:${config.ELASTICSEARCH_PORT}`],
    });
  }

  async initialize(): Promise<void> {
    try {
      const info = await this.client.info();
      logger.info('Elasticsearch connected:', info.version.number);

      // Create indices if they don't exist
      await this.ensureIndices();
    } catch (error) {
      throw new ElasticsearchError(
        `Failed to connect to Elasticsearch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async ensureIndices(): Promise<void> {
    const indices = [
      { name: 'products', mapping: this.getProductMapping() },
      { name: 'tickets', mapping: this.getTicketMapping() },
      { name: 'messages', mapping: this.getMessageMapping() },
    ];

    for (const { name, mapping } of indices) {
      try {
        const exists = await this.client.indices.exists({ index: name });
        if (!exists) {
          await this.client.indices.create({
            index: name,
            body: mapping,
          });
          logger.info(`Created index: ${name}`);
        }
      } catch (error) {
        logger.error(`Error ensuring index ${name}:`, error);
      }
    }
  }

  private getProductMapping() {
    return {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: { type: 'text' },
          description: { type: 'text' },
          price: { type: 'float' },
          stock: { type: 'integer' },
          sku: { type: 'keyword' },
          category: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    };
  }

  private getTicketMapping() {
    return {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          customerId: { type: 'keyword' },
          subject: { type: 'text' },
          description: { type: 'text' },
          status: { type: 'keyword' },
          priority: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          resolvedAt: { type: 'date' },
        },
      },
    };
  }

  private getMessageMapping() {
    return {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          role: { type: 'keyword' },
          content: { type: 'text' },
          timestamp: { type: 'date' },
          metadata: { type: 'object', enabled: false },
        },
      },
    };
  }

  async indexProduct(product: Product): Promise<void> {
    try {
      await this.client.index({
        index: 'products',
        id: product.id,
        body: product,
      });
    } catch (error) {
      throw new ElasticsearchError(
        `Failed to index product: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async searchProducts(query: string, limit: number = 10): Promise<Product[]> {
    try {
      const result = await this.client.search({
        index: 'products',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['name^2', 'description', 'category'],
            },
          },
          size: limit,
        },
      });

      return result.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      throw new ElasticsearchError(
        `Failed to search products: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const result = await this.client.get({
        index: 'products',
        id,
      });
      return result._source as Product;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw new ElasticsearchError(
        `Failed to get product: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async indexTicket(ticket: SupportTicket): Promise<void> {
    try {
      await this.client.index({
        index: 'tickets',
        id: ticket.id,
        body: ticket,
      });
    } catch (error) {
      throw new ElasticsearchError(
        `Failed to index ticket: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async searchTickets(
    customerId?: string,
    status?: string,
    limit: number = 10
  ): Promise<SupportTicket[]> {
    try {
      const filters = [];
      if (customerId) filters.push({ term: { customerId } });
      if (status) filters.push({ term: { status } });

      const result = await this.client.search({
        index: 'tickets',
        body: {
          query: {
            bool: {
              filter: filters.length > 0 ? filters : undefined,
            },
          },
          size: limit,
          sort: [{ createdAt: { order: 'desc' } }],
        },
      });

      return result.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      throw new ElasticsearchError(
        `Failed to search tickets: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getTicket(id: string): Promise<SupportTicket | null> {
    try {
      const result = await this.client.get({
        index: 'tickets',
        id,
      });
      return result._source as SupportTicket;
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      throw new ElasticsearchError(
        `Failed to get ticket: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<void> {
    try {
      await this.client.update({
        index: 'tickets',
        id,
        body: { doc: { ...updates, updatedAt: new Date() } },
      });
    } catch (error) {
      throw new ElasticsearchError(
        `Failed to update ticket: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export const elasticsearchService = new ElasticsearchService();
