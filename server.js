const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN;
const HOTMART_BASIC_AUTH = process.env.HOTMART_BASIC_AUTH;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'AMZ Ofertas - Lomadee + Hotmart',
    timestamp: new Date().toISOString(),
    endpoints: {
      lomadee: '/scrape/lomadee?limit=20',
      hotmart: '/scrape/hotmart?categoria=marketing&limit=20',
      test_lomadee: '/test/lomadee',
      test_hotmart: '/test/hotmart'
    }
  });
});

app.get('/scrape/lomadee', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    console.log('🔍 Lomadee: Buscando brands...');
    
    const response = await axios.get(
      'https://api-beta.lomadee.com.br/affiliate/brands',
      {
        params: { limit: limit, page: 1 },
        headers: { 'x-api-key': LOMADEE_APP_TOKEN },
        timeout: 30000
      }
    );
    
    if (!response.data || !response.data.data) {
      throw new Error('Lomadee API retornou resposta inválida');
    }
    
    const produtos = response.data.data.map(brand => {
      const comissao = brand.commission?.value || 0;
      
      return {
        titulo: brand.name,
        preco: 0,
        imagem_url: brand.logo,
        produto_url: brand.site,
        loja: brand.name,
        comissao_percentual: comissao,
        marketplace: 'lomadee',
        channels: brand.channels?.length || 0,
        amz_score: Math.min(comissao * 10, 100)
      };
    });
    
    produtos.sort((a, b) => b.amz_score - a.amz_score);
    
    res.json({
      success: true,
      total: produtos.length,
      marketplace: 'lomadee',
      produtos: produtos
    });
    
  } catch (error) {
    console.error('❌ Lomadee:', error.message);
    res.status(500).json({
      success: false,
      error: 'Falha ao buscar dados da Lomadee.',
      details: error.response ? error.response.data : error.message
    });
  }
});

app.get('/scrape/hotmart', async (req, res) => {
  try {
    const { categoria = 'desenvolvimento', limit = 20 } = req.query;
    
    console.log(`🔍 Hotmart: categoria "${categoria}"`);
    
    const tokenRe
