const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');

// Initialize Elasticsearch client
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

async function loadGurrexProducts() {
  try {
    const productsIndex = process.env.PRODUCTS_INDEX || 'gurrex_products';

    // Try to load from the gurrex products list
    const gurrexDataPath = path.resolve(
      __dirname,
      '../../gurrexes_relaunch_v2/src/frontend/src/data/productsList.js'
    );

    if (!fs.existsSync(gurrexDataPath)) {
      console.warn(`Gurrex data file not found at ${gurrexDataPath}`);
      console.log('Skipping product load - file not available');
      await client.close();
      return;
    }

    // Load the products list
    const fileContent = fs.readFileSync(gurrexDataPath, 'utf-8');

    // Extract the allProducts array from the ES module
    const match = fileContent.match(/export\s+const\s+allProducts\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) {
      console.warn('Could not parse allProducts from file');
      await client.close();
      return;
    }

    // Parse the JSON array
    const products = JSON.parse(match[1]);
    console.log(`Loaded ${products.length} products from Gurrex catalog`);

    // Transform products to match our schema
    const transformedProducts = products.map((product) => ({
      product_id: String(product.id || product.product_id),
      sku: product.sku || '',
      name: product.name || product.names?.en || '',
      description: product.description || product.descriptions?.en || '',
      price: Number(product.price) || 0,
      originalPrice: product.originalPrice || null,
      stock: Number(product.stockQuantity) || 0,
      category: product.category || 'uncategorized',
      brand: product.brand || '',
      rating: Number(product.rating) || 0,
      reviewCount: Number(product.reviewCount) || 0,
      images: product.images || [product.image],
      image: product.image || '',
      status: 'active',
    }));

    // Bulk index products
    const operations = [];
    for (const product of transformedProducts) {
      operations.push({ index: { _index: productsIndex, _id: product.product_id } });
      operations.push(product);
    }

    if (operations.length > 0) {
      const bulkResponse = await client.bulk({ operations });

      if (bulkResponse.errors) {
        console.error('Some products failed to index');
        bulkResponse.items?.forEach((item, index) => {
          if (item.index?.error) {
            console.error(`Product ${index} error:`, item.index.error);
          }
        });
      } else {
        console.log(`✅ Successfully indexed ${transformedProducts.length} products`);
      }
    }

    await client.close();
  } catch (error) {
    console.error('Error loading products:', error);
    process.exit(1);
  }
}

loadGurrexProducts();
