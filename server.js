// ===============================================================
// SERVER.JS - v.FINAL com SOLUCIONADOR DE CAPTCHA
// ===============================================================

console.log('=== AMZ OFERTAS INICIANDO - v.Final com Anti-Captcha ===');

const express = require('express');
const chromium = require('@sparticuz/chromium');

// IMPORTANTE: Agora usamos o puppeteer-extra
const puppeteer = require('puppeteer-extra');

// E adicionamos o plugin de "stealth" (furtividade)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// E o mais importante: o plugin para resolver CAPTCHAs
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: process.env.CAPTCHA_API_KEY // <-- ELE PEGA A CHAVE DO RENDER AQUI!
    },
    visualFeedback: true // Mostra um feedback visual no modo não-headless
  })
);

const app = express();
const PORT = process.env.PORT || 3000;

// ROTA DE TESTE
app.get('/', (req, res) => {
    res.json({ status: 'online', version: 'final-anti-captcha' });
});

// ROTA DO GARIMPEIRO
app.get('/scrape', async (req, res) => {
    console.log('>>> INICIANDO GARIMPO COM ARMAMENTO ANTI-CAPTCHA... <<<');
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
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

        console.log('Navegando para a Shopee...');
        await page.goto('https://shopee.com.br/search?keyword=fone%20de%20ouvido%20bluetooth', {
            waitUntil: 'networkidle2',
            timeout: 120000 // Aumentado para 2 minutos para dar tempo de resolver o captcha
        } );

        console.log('Página carregada. Verificando se há CAPTCHAs...');
        // O plugin vai tentar resolver o captcha automaticamente aqui.
        // Se houver um, ele vai parar, enviar para o 2Captcha, e esperar a solução.
        await page.solveRecaptchas();
        
        console.log('CAPTCHA resolvido (ou não era necessário). Extraindo dados...');
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
