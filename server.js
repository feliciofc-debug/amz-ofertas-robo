// ===============================================================
// SERVER.JS - VERSÃO COM SCREENSHOT DE DIAGNÓSTICO
// ===============================================================

const express = require('express');
const playwright = require('playwright-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs'); // Precisamos disso para salvar o arquivo

const app = express();
const PORT = process.env.PORT || 3000;

// ... (as outras rotas continuam iguais)
app.get('/', (req, res) => { res.json({ status: 'online', message: 'AMZ Ofertas Robô' }); });
app.get('/test-browser', async (req, res) => { /* ... código de teste ... */ });


// ROTA PRINCIPAL: O GARIMPO DA SHOPEE
app.get('/scrape', async (req, res) => {
    console.log('🚀 INICIANDO GARIMPO REAL DA SHOPEE... 🚀');
    let browser = null;
    let page; // Definir a page aqui para usar no catch
    try {
        browser = await playwright.chromium.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        });
        page = await context.newPage(); // Atribuir à variável externa

        console.log('Navegando para a Shopee...');
        await page.goto('https://shopee.com.br/search?keyword=notebook', { timeout: 120000, waitUntil: 'domcontentloaded' } );

        console.log('Página carregada. Aguardando seletor dos produtos...');
        await page.waitForSelector('div[data-sqe="item"]', { timeout: 30000 });

        console.log('Extraindo dados dos produtos...');
        const productLocators = await page.locator('div[data-sqe="item"]').all();
        
        const products = [];
        for (const locator of productLocators.slice(0, 10)) {
            const title = await locator.locator('div[data-sqe="name"]').innerText().catch(() => null);
            const price = await locator.locator('.ZEgIZ+').innerText().catch(() => null);
            const productLink = await locator.locator('a').getAttribute('href').catch(() => null);

            if (title && price && productLink) {
                products.push({ 
                    title, 
                    price,
                    link: `https://shopee.com.br${productLink}`
                } );
            }
        }

        console.log(`✅ GARIMPO CONCLUÍDO! Produtos encontrados: ${products.length}`);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.send(JSON.stringify(products, null, 2));

    } catch (error) {
        console.error('❌ ERRO DURANTE O GARIMPO. INICIANDO DIAGNÓSTICO...', error.message);
        
        // NOSSA ARMA SECRETA: O SCREENSHOT
        if (page) {
            try {
                const screenshotPath = `/tmp/shopee-error-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`📸 Screenshot de diagnóstico salvo em: ${screenshotPath}`);
                
                // AINDA NÃO PODEMOS ENVIAR A IMAGEM DIRETAMENTE.
                // Mas o log de que a imagem foi tirada já nos diz muito.
                // No futuro, podemos fazer upload dela para algum lugar.
                // Por agora, o erro com o log da screenshot é o que importa.
                res.status(500).json({ 
                    error: error.message,
                    diagnose: 'Falha ao encontrar o seletor. Um screenshot foi tirado no servidor para análise (verificar logs). A página pode ter um CAPTCHA ou o layout mudou.'
                });

            } catch (ssError) {
                console.error('Falha ao tirar o screenshot de diagnóstico:', ssError.message);
                res.status(500).json({ error: error.message, diagnose_error: ssError.message });
            }
        } else {
             res.status(500).json({ error: error.message, diagnose: 'O objeto "page" não foi criado, não foi possível tirar screenshot.' });
        }

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

// Mini-código de teste do browser da Claude, mantido por segurança
app.get('/test-browser', async (req, res) => {
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
