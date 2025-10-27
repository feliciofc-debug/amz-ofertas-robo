const express = require('express');
const axios = require('axios');
const playwright = require('playwright-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'AMZ Ofertas - Hybrid Mode',
    timestamp: new Date().toISOString()
  });
});

app.get('/scrape/shopee', async (req, res) => {
  let browser = null;
  
  try {
    const { query = 'notebook', limit = 20 } = req.query;
    
    console.log('🔐 Obtendo cookies da Shopee...');
    
    // 1. Abrir navegador SÓ para pegar cookies
    const executablePath = await chromium.executablePath();
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: chromium.headless,
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // 2. Visitar página inicial (rápido, sem esperar produtos)
    await page.goto('https://shopee.com.br/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Cookies obtidos');
    
    // 3. Pegar cookies
    const cookies = await context.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // 4. Fechar navegador (já temos os cookies)
    await browser.close();
    browser = null;
    
    console.log('📡 Fazendo requisição API com cookies...');
    
    // 5. Fazer requisição HTTP com os cookies
    const response = await axios.get('https://shopee.com.br/api/v4/search/search_items', {
      params: {
        keyword: query,
        limit: limit,
        newest: 0,
        order: 'desc',
        page_type: 'search',
        scenario: 'PAGE_GLOBAL_SEARCH',
        version: 2
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://shopee.com.br/',
        'Cookie': cookieString
      },
      timeout: 30000
    });
    
    console.log('✅ Dados recebidos');
    
    // 6. Processar produtos
    const produtos = response.data.items
      .filter(item => item.item_basic)
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
      metodo: 'HYBRID',
      produtos: produtos
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
