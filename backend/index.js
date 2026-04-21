const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const migrations = {}; // In-memory store for migration progress

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWooProducts(wooUrl, wooKey, wooSecret, page = 1) {
    const wooAuth = Buffer.from(`${wooKey}:${wooSecret}`).toString('base64');
    try {
        const response = await axios.get(`${wooUrl}/wp-json/wc/v3/products`, {
            headers: { Authorization: `Basic ${wooAuth}` },
            params: { page, per_page: 50 }
        });
        const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
        const totalProducts = parseInt(response.headers['x-wp-total'] || '0', 10);
        return { products: response.data, totalPages, totalProducts };
    } catch (error) {
        throw new Error(`WooCommerce API Error: ${error.response?.data?.message || error.message}`);
    }
}

async function createShopifyProduct(shopifyStore, shopifyToken, product) {
    const url = `https://${shopifyStore}/admin/api/2024-01/products.json`;
    const data = {
        product: {
            title: product.name,
            body_html: product.description,
            variants: [{ price: product.price }],
            images: product.images ? product.images.map(img => ({ src: img.src })) : [],
            product_type: product.categories && product.categories.length > 0 ? product.categories[0].name : '',
            tags: product.categories ? product.categories.map(c => c.name).join(', ') : '',
            status: 'draft' // Create as draft to be safe
        }
    };

    try {
        await axios.post(url, data, {
            headers: {
                'X-Shopify-Access-Token': shopifyToken,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        throw new Error(`Shopify Error creating ${product.name}: ${error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message}`);
    }
}

async function runMigration(migrationId, payload) {
    const { wooUrl, wooKey, wooSecret, shopifyStore, shopifyToken } = payload;
    let storeHost = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!storeHost.includes('.myshopify.com')) {
        storeHost += '.myshopify.com';
    }

    // Clean up Woo URl
    const cleanWooUrl = wooUrl.replace(/\/$/, '');

    try {
        let currentPage = 1;
        let totalPages = 1;
        let fetchedFirstPage = false;

        while (currentPage <= totalPages) {
            migrations[migrationId].status = `Fetching WooCommerce page ${currentPage}...`;
            const { products, totalPages: fetchedPages, totalProducts } = await fetchWooProducts(cleanWooUrl, wooKey, wooSecret, currentPage);
            
            if (!fetchedFirstPage) {
                totalPages = fetchedPages;
                migrations[migrationId].total = totalProducts;
                fetchedFirstPage = true;
            }

            for (const product of products) {
                if (migrations[migrationId].status === 'failed') return; // Cancel if global failure
                
                try {
                    await createShopifyProduct(storeHost, shopifyToken, product);
                    migrations[migrationId].migrated += 1;
                } catch (error) {
                    console.error(error);
                    migrations[migrationId].errors += 1;
                    migrations[migrationId].errorDetails.push(error.message);
                }
                
                // Add minimum 500ms delay to avoid shopify rate limits (Shopify REST limit is usually 2/sec)
                await sleep(550);
            }
            
            currentPage++;
        }

        migrations[migrationId].status = 'completed';

    } catch (error) {
        console.error("Migration failed:", error);
        migrations[migrationId].status = 'failed';
        migrations[migrationId].errorDetails.push(error.message);
    }
}


app.post('/start-migration', (req, res) => {
    const { wooUrl, wooKey, wooSecret, shopifyStore, shopifyToken } = req.body;
    
    if (!wooUrl || !wooKey || !wooSecret || !shopifyStore || !shopifyToken) {
        return res.status(400).json({ error: 'Missing required credentials' });
    }

    const migrationId = crypto.randomBytes(16).toString('hex');
    
    migrations[migrationId] = {
        id: migrationId,
        total: 0,
        migrated: 0,
        errors: 0,
        status: 'initializing',
        errorDetails: []
    };

    // Run async
    runMigration(migrationId, req.body);

    res.json({ migrationId });
});

app.post('/start-demo-migration', (req, res) => {
    const migrationId = 'demo-' + crypto.randomBytes(8).toString('hex');
    
    migrations[migrationId] = {
        id: migrationId,
        total: 10,
        migrated: 0,
        errors: 0,
        status: 'migrating',
        errorDetails: []
    };

    // Simulate progress
    (async () => {
        for (let i = 0; i < 10; i++) {
            await sleep(1000);
            if (Math.random() > 0.8) {
                migrations[migrationId].errors += 1;
                migrations[migrationId].errorDetails.push(`Failed to migrate "Demo Product ${i + 1}": Connection timeout`);
            } else {
                migrations[migrationId].migrated += 1;
            }
        }
        migrations[migrationId].status = 'completed';
    })();

    res.json({ migrationId });
});

app.get('/migration-status/:id', (req, res) => {
    const { id } = req.params;
    const migration = migrations[id];
    
    if (!migration) {
        return res.status(404).json({ error: 'Migration not found' });
    }

    res.json(migration);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
