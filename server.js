// ===============================================================
// SERVER.JS - VERSÃO FINAL DE SCRAPING (PÓS-VITÓRIA)
// ===============================================================

const express = require('express');
const playwright = require('playwright-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

// Rota de Status (para verificar se o servidor está vivo)
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'AMZ Ofertas Robô está vivo e pronto para o garimpo!',
    engine: '@sparticuz/chromium',
    timestamp: new Date().toISOString()
  });
});

// Rota de Teste do Navegador (para emergências)
app.get('/test-browser', async (req, res) => {
    // ... (o código de teste da Claude continua aqui, para nossa segurança)
    let browser = null;
    try {
        browser = await playwright.chromium.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        const page = await browser.newPage();
        await page.goto('https://example.com', { timeout: 30000 } );
        const title = await page.title();
        await browser.close();
        res.json({ success: true, message: 'Navegador funcionando!', pageTitle: title });
    } catch (error) {
        if (browser) await browser.close();
        res.status(500).json({ success: false, error: error.message });
    }
});

// ROTA PRINCIPAL: O GARIMPO DA SHOPEE
app.get('/scrape', async (req, res) => {
    console.log('🚀 INICIANDO GARIMPO REAL DA SHOPEE... 🚀');
    let browser = null;
    try {
        browser = await playwright.chromium.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        console.log('Navegando para a Shopee...');
        // Vamos buscar por "notebook" como teste
        await page.goto('https://shopee.com.br/search?keyword=notebook', { timeout: 120000 } );

        console.log('Página carregada. Aguardando seletor dos produtos...');
        await page.waitForSelector('div[data-sqe="item"]', { timeout: 30000 });

        console.log('Extraindo dados dos produtos...');
        const productLocators = await page.locator('div[data-sqe="item"]').all();
        
        const products = [];
        for (const locator of productLocators.slice(0, 10)) { // Vamos pegar 10 produtos
            const title = await locator.locator('div[data-sqe="name"]').innerText().catch(() => null);
            const price = await locator.locator('.ZEgIZ+').innerText().catch(() => null);
            // Extraindo o link
            const productLink = await locator.locator('a').getAttribute('href').catch(() => null);

            if (title && price && productLink) {
                products.push({ 
                    title, 
                    price,
                    // Construindo o link completo
                    link: `https://shopee.com.br${productLink}`
                } );
            }
        }

        console.log(`✅ GARIMPO CONCLUÍDO! Produtos encontrados: ${products.length}`);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.send(JSON.stringify(products, null, 2));

    } catch (error) {
        console.error('❌ ERRO DURANTE O GARIMPO REAL ❌', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) {
            await browser.close();
            console.log('✅ Navegador fechado. Missão concluída.');
        }
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor pronto para a colheita na porta ${PORT}`);
});
