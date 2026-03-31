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

      // Generate response with product information
      const context = {
        products: products.map((p: any) => ({
          product_id: p.product_id,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          category: p.category,
          rating: p.rating,
          status: p.status,
        })),
      };

      const response = await this.generateResponse(lastMessage, context);

      let updatedState = this.addMessage(state, 'assistant', response);
      updatedState = { ...updatedState, status: 'completed' };

      // Send email notification if customer email is provided
      if (state.context?.customerEmail) {
        try {
          if (products.length > 0) {
            await emailService.sendPricingInquiryResponse(
              state.context.customerEmail,
              products[0].name,
              products[0].price,
              products[0].stock
            );
          }
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
