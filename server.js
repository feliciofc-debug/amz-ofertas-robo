// ===============================================================
// SERVER.JS - v.PLAYWRIGHT CORRIGIDO
// ===============================================================

console.log('=== AMZ OFERTAS INICIANDO - v.Playwright (Corrigido) ===');

const express = require('express');
// IMPORTANTE: Agora importamos 'playwright'
const { chromium } = require('playwright'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ status: 'online', engine: 'Playwright' });
});

app.get('/scrape', async (req, res) => {
    console.log('>>> INICIANDO GARIMPO COM MOTOR PLAYWRIGHT... <<<');
    let browser = null;
    try {
        console.log('Iniciando o navegador Chromium do Playwright...');
        // A forma de iniciar também muda um pouco
        browser = await chromium.launch(); 
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        console.log('Navegando para a Shopee...');
        await page.goto('https://shopee.com.br/search?keyword=fone%20de%20ouvido%20bluetooth', { timeout: 120000 } );

        console.log('Página carregada. Extraindo dados...');
        const productLocators = await page.locator('div[data-sqe="item"]').all();
        
        const products = [];
        for (const locator of productLocators.slice(0, 5)) {
            const title = await locator.locator('div[data-sqe="name"]').innerText().catch(() => null);
            const price = await locator.locator('.ZEgIZ+').innerText().catch(() => null);
            if (title && price) {
                products.push({ title, price });
            }
        }

        console.log(`GARIMPO CONCLUÍDO! Produtos encontrados: ${products.length}`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(products, null, 2));

    } catch (error) {
        console.error('### ERRO DURANTE O GARIMPO COM PLAYWRIGHT ###', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) {
            await browser.close();
            console.log('Navegador Playwright fechado.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`=== SERVIDOR PLAYWRIGHT PRONTO NA PORTA ${PORT} ===`);
});
