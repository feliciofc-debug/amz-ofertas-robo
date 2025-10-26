// ===============================================================
// SERVER.JS - v.SUPER HUMANO 
// ===============================================================

console.log('=== AMZ OFERTAS INICIANDO - v.Super Humano ===');

const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 3000;

// ROTA DE TESTE
app.get('/', (req, res) => {
    res.json({ status: 'online', version: 'super-humano' });
});

// ROTA DO GARIMPEIRO
app.get('/scrape', async (req, res) => {
    console.log('>>> INICIANDO GARIMPO EM MODO SUPER-HUMANO... <<<');
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-zygote',
                '--single-process'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // TÉCNICA 1: MASCARANDO O NAVEGADOR
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

        console.log('Navegando para a Shopee como um "humano"...');
        await page.goto('https://shopee.com.br/search?keyword=fone%20de%20ouvido%20bluetooth', {
            waitUntil: 'networkidle2',
            timeout: 60000 // Vamos deixar um timeout de 60s, um meio-termo seguro.
        } );

        // TÉCNICA 2: PAUSA ESTRATÉGICA
        console.log('Página carregada. Aguardando 2 segundos para scripts adicionais...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Extraindo dados dos produtos...');
        const products = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('div[data-sqe="item"]').forEach(el => {
                const title = el.querySelector('div[data-sqe="name"]')?.innerText;
                const price = el.querySelector('.ZEgIZ+')?.innerText;
                if (title && price) {
                    items.push({ title, price });
                }
            });
            return items.slice(0, 5);
        });

        console.log(`GARIMPO CONCLUÍDO! Produtos encontrados: ${products.length}`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(products, null, 2));

    } catch (error) {
        console.error('### ERRO DURANTE O GARIMPO ###', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) {
            await browser.close();
            console.log('Navegador fechado.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`=== SERVIDOR PRONTO NA PORTA ${PORT} ===`);
});
