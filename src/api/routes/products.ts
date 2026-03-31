import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { elasticsearchService } from '../../services/elasticsearch';
import { ProductSchema } from '../../types';

const router = Router();

const CreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  stock: z.number().nonnegative(),
  sku: z.string(),
  category: z.string(),
});

const SearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
});

// Search products
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, limit } = SearchSchema.parse(req.query);

    const products = await elasticsearchService.findProductsByNameOrDescription(query, limit || 10);

    res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    next(error);
  }
});

// Get product by ID (from gurrex_products index)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to get product by product_id or document id
    const result = await elasticsearchService.getProduct(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    res.json({
      success: true,
      product: result,
    });
  } catch (error) {
    next(error);
  }
});

// Create product
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateProductSchema.parse(req.body);

    const product = ProductSchema.parse({
      id: uuid(),
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await elasticsearchService.indexProduct(product);

    res.status(201).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
