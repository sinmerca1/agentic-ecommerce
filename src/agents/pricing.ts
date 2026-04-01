import { BaseAgent } from './base';
import { AgentState, Product } from '../types';
import { elasticsearchService } from '../services/elasticsearch';
import { emailService } from '../services/email';

export class PricingAgent extends BaseAgent {
  constructor() {
    super('PricingAgent');
  }

  systemPrompt(): string {
    return `You are a pricing specialist agent for an e-commerce platform.
Your responsibilities are:
1. Provide accurate product pricing information
2. Handle bulk pricing inquiries
3. Assist with price comparisons
4. Recommend products based on budget constraints
5. Provide promotional pricing information when available

When responding to pricing queries:
- Always include the product name, price, and availability
- If the product is out of stock, suggest alternatives
- Be helpful and professional in your tone
- Format prices clearly with currency symbols`;
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
      this.logger.info('Processing pricing query:', { query: lastMessage });

      // Search for relevant products using gurrex_products index
      const products = await elasticsearchService.findProductsByNameOrDescription(lastMessage, 5);

      if (products.length === 0) {
        const response = "I couldn't find any products matching your query. Could you please provide more details about what you're looking for?";
        return this.addMessage(state, 'assistant', response);
      }

      // Only use the top 1 most relevant product to reduce context size
      const topProduct = products[0];
      const truncateDescription = (desc: string, maxLength: number = 200): string => {
        return desc.length > maxLength ? desc.substring(0, maxLength) + '...' : desc;
      };

      // Generate response with product information
      const context = {
        product: {
          product_id: topProduct.product_id,
          name: topProduct.name,
          description: truncateDescription(topProduct.description),
          price: topProduct.price,
          stock: topProduct.stock,
          category: topProduct.category,
          rating: topProduct.rating,
          status: topProduct.status,
        },
      };

      const response = await this.generateResponse(lastMessage, context);

      let updatedState = this.addMessage(state, 'assistant', response);
      updatedState = { ...updatedState, status: 'completed' };

      // Send email notification if customer email is provided
      if (state.context?.customerEmail) {
        try {
          await emailService.sendPricingInquiryResponse(
            state.context.customerEmail,
            topProduct.name,
            topProduct.price,
            topProduct.stock
          );
        } catch (error) {
          this.logger.error('Failed to send pricing email:', error);
          // Don't fail the entire request due to email error
        }
      }

      return updatedState;
    } catch (error) {
      this.logger.error('Pricing agent error:', error);
      return {
        ...state,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
