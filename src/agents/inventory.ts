import { BaseAgent } from './base';
import { AgentState, Product } from '../types';
import { elasticsearchService } from '../services/elasticsearch';
import { emailService } from '../services/email';

export class InventoryAgent extends BaseAgent {
  constructor() {
    super('InventoryAgent');
  }

  systemPrompt(): string {
    return `You are an inventory management specialist agent for an e-commerce platform.
Your responsibilities are:
1. Check product stock levels
2. Provide restock recommendations
3. Alert about low stock situations
4. Suggest alternative products when items are out of stock
5. Provide inventory forecasting insights

When responding to inventory queries:
- Always include the product name and current stock level
- Clearly indicate if a product is in stock or out of stock
- Suggest alternatives if the requested product is unavailable
- Be proactive in recommending restocking
- Use professional and helpful language`;
  }

  async process(state: AgentState): Promise<AgentState> {
    const lastMessage = this.getLastUserMessage(state);
    if (!lastMessage) {
      return {
        ...state,
        status: 'error',
        error: 'No user message found',
      };
    }

    try {
      this.logger.info('Processing inventory query:', { query: lastMessage });

      // Search for relevant products using gurrex_products index
      const products = await elasticsearchService.searchGurrexProducts(lastMessage, 5);

      if (products.length === 0) {
        const response = "I couldn't find any products matching your inventory query. Could you please provide more details?";
        return this.addMessage(state, 'assistant', response);
      }

      // Check inventory levels
      const lowStockThreshold = state.context?.lowStockThreshold || 10;
      const lowStockProducts = products.filter((p: any) => p.stock < lowStockThreshold);

      const context = {
        products: products.map((p: any) => ({
          product_id: p.product_id,
          name: p.name,
          stock: p.stock,
          category: p.category,
          lowStock: p.stock < lowStockThreshold,
          price: p.price,
        })),
        lowStockProducts: lowStockProducts.length,
        threshold: lowStockThreshold,
      };

      const response = await this.generateResponse(lastMessage, context);

      let updatedState = this.addMessage(state, 'assistant', response);
      updatedState = { ...updatedState, status: 'completed' };

      // Send alerts for low stock
      if (state.context?.managerEmail && lowStockProducts.length > 0) {
        try {
          for (const product of lowStockProducts) {
            await emailService.sendInventoryAlert(
              state.context.managerEmail,
              product.name,
              product.stock,
              lowStockThreshold
            );
          }
        } catch (error) {
          this.logger.error('Failed to send inventory alert email:', error);
        }
      }

      return updatedState;
    } catch (error) {
      this.logger.error('Inventory agent error:', error);
      return {
        ...state,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
