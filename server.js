const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = process.env.PORT || 3000;

async function scrapeShopee() {
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

  return products;
}

app.get('/', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const scrapedProducts = await scrapeShopee();
    res.send(JSON.stringify(scrapedProducts, null, 2));
  } catch (error) {
    console.error(error);
    res.status(500).send('Ocorreu um erro durante o garimpo: ' + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor do robô rodando na porta ${PORT}`);
});
