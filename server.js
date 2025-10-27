const express = require('express');
const playwright = require('playwright-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'AMZ Ofertas - Interceptor Mode',
    timestamp: new Date().toISOString()
  });
});

app.get('/scrape/shopee', async (req, res) => {
  let browser = null;
  
  try {
    const { query = 'notebook', limit = 20 } = req.query;
    
    console.log(`🔍 Scraping: ${query}`);
    
    const executablePath = await chromium.executablePath();
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: true,
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    let apiData = null;
    
    // Interceptar requisição da API
    page.on('response', async (response) => {
      if (response.url().includes('api/v4/search/search_items')) {
        try {
          apiData = await response.json();
        } catch (e) {}
      }
    });
    
    // Navegar
    await page.goto(`https://shopee.com.br/search?keyword=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await browser.close();
    
    if (!apiData || !apiData.items) {
      throw new Error('Não conseguiu interceptar dados');
    }
    
    const produtos = apiData.items
      .filter(item => item.item_basic)
      .slice(0, parseInt(limit))
      .map(item => {
        const p = item.item_basic;
        return {
          titulo: p.name,
          preco: p.price / 100000,
          imagem: `https://down-br.img.susercontent.com/file/${p.image}`,
          url: `https://shopee.com.br/product/${p.shopid}/${p.itemid}`,
          vendas: p.sold || 0,
          avaliacao: p.item_rating?.rating_star || 0
        };
      });
    
    res.json({
      success: true,
      total: produtos.length,
      metodo: 'INTERCEPTOR',
      produtos: produtos
    });
    
  } catch (error) {
    console.error('❌', error.message);
    
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Porta ${PORT}`);
});
