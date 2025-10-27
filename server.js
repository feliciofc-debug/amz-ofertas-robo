const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'AMZ Ofertas API',
    timestamp: new Date().toISOString()
  });
});

app.get('/scrape/shopee', async (req, res) => {
  try {
    const { query = 'notebook', limit = 20 } = req.query;
    
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
        'Origin': 'https://shopee.com.br',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      },
      timeout: 30000
    });
    
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
      produtos: produtos
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
