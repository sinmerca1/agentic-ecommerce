import { Client } from '@elastic/elasticsearch';
import { Product, SupportTicket } from '../types';

// Initialize Elasticsearch client
const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || `http://${process.env.ELASTICSEARCH_HOST || 'localhost'}:${process.env.ELASTICSEARCH_PORT || 9200}`,
  auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD,
  } : undefined,
});

// Service class for Elasticsearch operations
class ElasticsearchService {
  private client: Client;
  private productsIndex: string;
  private ticketsIndex = 'support_tickets';

  constructor(client: Client) {
    this.client = client;
    // Read products index from environment variable, default to gurrex_products
    this.productsIndex = process.env.PRODUCTS_INDEX || 'gurrex_products';
  }

  async initialize() {
    try {
      const health = await this.client.cluster.health();
      console.log('Elasticsearch connected:', health);
      return true;
    } catch (error) {
      console.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.client.close();
      console.log('Elasticsearch client closed');
    } catch (error) {
      console.error('Error closing Elasticsearch client:', error);
    }
  }

  async checkConnection() {
    try {
      const health = await this.client.cluster.health();
      return { status: 'connected', health };
    } catch (error) {
      return { status: 'error', error };
    }
  }

  async indexProduct(product: Product) {
    try {
      await this.client.index({
        index: this.productsIndex,
        id: product.id,
        document: {
          ...product,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error indexing product:', error);
      throw error;
    }
  }

  async searchProducts(query: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.client.search({
        index: this.productsIndex,
        size: limit,
        query: {
          multi_match: {
            query,
            fields: ['name^2', 'description', 'category'],
            fuzziness: 'AUTO',
          },
        },
      });

      return (result.hits.hits || []).map((hit: any) => ({
        product_id: hit._source.product_id || hit._id,
        name: hit._source.name,
        description: hit._source.description,
        price: hit._source.price,
        stock: hit._source.stock,
        category: hit._source.category,
        rating: hit._source.rating,
        images: hit._source.images,
        status: hit._source.status,
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      // Return empty array if search fails (index might not exist yet)
      return [];
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const result = await this.client.get({
        index: this.productsIndex,
        id,
      });

      if (!result.found) return null;

      return {
        ...result._source as any,
        id: result._id,
        createdAt: new Date((result._source as any).createdAt),
        updatedAt: new Date((result._source as any).updatedAt),
      };
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      console.error('Error getting product:', error);
      throw error;
    }
  }

  async indexTicket(ticket: SupportTicket) {
    try {
      await this.client.index({
        index: this.ticketsIndex,
        id: ticket.id,
        document: {
          ...ticket,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          resolvedAt: ticket.resolvedAt?.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error indexing ticket:', error);
      throw error;
    }
  }

  async searchTickets(
    customerId?: string,
    status?: string,
    limit: number = 10
  ): Promise<SupportTicket[]> {
    try {
      const must: any[] = [];

      if (customerId) {
        must.push({ match: { customerId } });
      }

      if (status) {
        must.push({ match: { status } });
      }

      const result = await this.client.search({
        index: this.ticketsIndex,
        size: limit,
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
        sort: [{ createdAt: { order: 'desc' } }],
      });

      return (result.hits.hits || []).map((hit: any) => ({
        ...hit._source,
        id: hit._id,
        createdAt: new Date(hit._source.createdAt),
        updatedAt: new Date(hit._source.updatedAt),
        resolvedAt: hit._source.resolvedAt ? new Date(hit._source.resolvedAt) : undefined,
      }));
    } catch (error) {
      console.error('Error searching tickets:', error);
      // Return empty array if search fails
      return [];
    }
  }

  async getTicket(id: string): Promise<SupportTicket | null> {
    try {
      const result = await this.client.get({
        index: this.ticketsIndex,
        id,
      });

      if (!result.found) return null;

      const source = result._source as any;
      return {
        ...source,
        id: result._id,
        createdAt: new Date(source.createdAt),
        updatedAt: new Date(source.updatedAt),
        resolvedAt: source.resolvedAt ? new Date(source.resolvedAt) : undefined,
      };
    } catch (error: any) {
      if (error.statusCode === 404) return null;
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  async updateTicket(id: string, updates: Partial<SupportTicket>) {
    try {
      const updateDoc: any = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (updates.createdAt) {
        updateDoc.createdAt = updates.createdAt.toISOString();
      }
      if (updates.resolvedAt) {
        updateDoc.resolvedAt = updates.resolvedAt.toISOString();
      }

      await this.client.update({
        index: this.ticketsIndex,
        id,
        doc: updateDoc,
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  }

  async searchGurrexProducts(searchTerm: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.client.search({
        index: this.productsIndex,
        size: limit,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: searchTerm,
                  fields: ['name^3', 'description^2', 'category'],
                  fuzziness: 'AUTO',
                  operator: 'or',
                },
              },
            ],
            filter: [
              {
                term: { status: 'active' },
              },
            ],
          },
        },
      });

      return (result.hits.hits || []).map((hit: any) => {
        const source = hit._source;
        return {
          product_id: source.product_id || hit._id,
          name: source.name,
          description: source.description,
          price: source.price,
          stock: source.stock,
          category: source.category,
          rating: source.rating || 0,
          images: source.images || [],
          status: source.status,
          relevance_score: hit._score,
        };
      });
    } catch (error) {
      console.error('Error searching gurrex products:', error);
      return [];
    }
  }

  async findProductsByNameOrDescription(searchTerm: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.client.search({
        index: this.productsIndex,
        size: limit,
        query: {
          bool: {
            should: [
              {
                match: {
                  name: {
                    query: searchTerm,
                    boost: 3,
                    fuzziness: 'AUTO',
                  },
                },
              },
              {
                match: {
                  description: {
                    query: searchTerm,
                    boost: 1.5,
                    fuzziness: 'AUTO',
                  },
                },
              },
              {
                match: {
                  category: {
                    query: searchTerm,
                    boost: 2,
                  },
                },
              },
            ],
            minimum_should_match: 1,
            filter: [
              {
                term: { status: 'active' },
              },
              {
                range: { stock: { gte: 0 } },
              },
            ],
          },
        },
        sort: [
          { _score: { order: 'desc' } },
          { price: { order: 'asc' } },
        ],
      });

      return (result.hits.hits || []).map((hit: any) => {
        const source = hit._source;
        return {
          product_id: source.product_id || hit._id,
          name: source.name,
          description: source.description,
          price: source.price,
          stock: source.stock,
          category: source.category,
          rating: source.rating || 0,
          images: source.images || [],
          status: source.status,
          relevance_score: hit._score,
        };
      });
    } catch (error) {
      console.error('Error finding products by name or description:', error);
      return [];
    }
  }
}

// Export singleton instance
export const elasticsearchService = new ElasticsearchService(elasticsearchClient);
