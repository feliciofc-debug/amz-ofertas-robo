// ===============================================================
// SERVER.JS - v.FINAL com SELETORES ATUALIZADOS
// ===============================================================

console.log('=== AMZ OFERTAS INICIANDO - v.Final com Mapa Atualizado ===');
console.log('Porta configurada:', process.env.PORT || 'PORTA NÃO DEFINIDA');
console.log('Ambiente:', process.env.NODE_ENV || 'desenvolvimento');

const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 3000;

// ROTA DE TESTE DE "BATIMENTO CARDÍACO"
app.get('/', (req, res) => {
    console.log('>>> REQUISIÇÃO RECEBIDA NA RAIZ (/)! O SERVIDOR ESTÁ RESPONDENDO! <<<');
    res.json({ 
        status: 'online',
        message: 'AMZ Ofertas Robô está vivo e respondendo!',
        version: 'final-mapa-atualizado',
        timestamp: new Date().toISOString()
    });
});

// ROTA DO GARIMPEIRO
app.get('/scrape', async (req, res) => {
    console.log('>>> REQUISIÇÃO RECEBIDA EM /scrape! INICIANDO GARIMPO COM MAPA NOVO... <<<');
    let browser = null;
    try {
        console.log('Iniciando o navegador com a estratégia OTIMIZADA PARA MEMÓRIA...');
        
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
        console.log('Navegando para a Shopee...');
        await page.goto('https://shopee.com.br/search?keyword=fone%20de%20ouvido%20bluetooth', {
            waitUntil: 'networkidle2'
        } );

        console.log('Extraindo dados dos produtos com seletores ATUALIZADOS...');
        const products = await page.evaluate(() => {
            const items = [];
            // ***** A MUDANÇA ESTÁ AQUI *****
            document.querySelectorAll('div[data-sqe="item"]').forEach(el => {
                const title = el.querySelector('div[data-sqe="name"]')?.innerText;
                const price = el.querySelector('.ZEgIZ+')?.innerText; // Esta classe ainda parece funcionar para o preço
                if (title && price) {
                    items.push({ title, price });
                }
            });
            return items.slice(0, 5); // Pega apenas os 5 primeiros
        });

        console.log('GARIMPO CONCLUÍDO COM SUCESSO!');
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(products, null, 2));

    } catch (error) {
        console.error('### ERRO DURANTE O GARIMPO ###', error);
        res.status(500).json({
            status: 'error',
            message: 'Ocorreu um erro durante o garimpo.',
            error: error.message
        });
    } finally {
        if (browser) {
            await browser.close();
            console.log('Navegador fechado com sucesso.');
        }
    }
});

app.listen(PORT, () => {
    console.log(`=== SERVIDOR DO ROBÔ RODANDO NA PORTA ${PORT} E PRONTO PARA RECEBER REQUISIÇÕES ===`);
});
