// ===============================================================
// SERVER.JS COM DIAGNÓSTICO SUGERIDO PELA CLAUDE
// ===============================================================

console.log('=== AMZ OFERTAS INICIANDO ===');
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
        timestamp: new Date().toISOString()
    });
});

// ROTA DO GARIMPEIRO (AGORA EM /scrape)
app.get('/scrape', async (req, res) => {
    console.log('>>> REQUISIÇÃO RECEBIDA EM /scrape! INICIANDO GARIMPO... <<<');
    try {
        console.log('Iniciando o navegador com a nova estratégia...');
        const browser = await puppeteer.launch({
            args: chromium.args,
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

        console.log('Extraindo dados dos produtos...');
        const products = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.col-xs-2-4.shopee-search-item-result__item').forEach(el => {
                const title = el.querySelector('.Cve6sh, ._10Wbs-._5SSWfi, ._2w3n0-._2R-9th, ._1W2gAb, ._1W2gAb._3_30pA, ._1W2gAb._1a2k1A, ._1W2gAb._3_30pA._1a2k1A')?.innerText;
                const price = el.querySelector('._29R_un, ._3_30pA, ._1_5_pA, ._1_5_pA._3_30pA')?.innerText;
                if (title && price) {
                    items.push({ title, price });
                }
            });
            return items.slice(0, 5);
        });

        console.log('Fechando o navegador...');
        await browser.close();
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
    }
});

app.listen(PORT, () => {
    console.log(`=== SERVIDOR DO ROBÔ RODANDO NA PORTA ${PORT} E PRONTO PARA RECEBER REQUISIÇÕES ===`);
});
