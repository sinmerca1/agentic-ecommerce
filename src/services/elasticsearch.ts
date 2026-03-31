import { Client } from '@elastic/elasticsearch';

// Simple client initialization
export const elasticsearchClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

// Export a dummy function to avoid breaking imports
export async function checkConnection() {
  try {
    const health = await elasticsearchClient.cluster.health();
    return { status: 'connected', health };
  } catch (error) {
    return { status: 'error', error };
  }
}
