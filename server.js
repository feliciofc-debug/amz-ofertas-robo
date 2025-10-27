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
    message: 'AMZ Ofertas API',
    endpoints: {
      test_lomadee: '/test/lomadee',
      test_hotmart: '/test/hotmart',
      lomadee: '/scrape/lomadee?limit=20',
      hotmart: '/scrape/hotmart?limit=20'
    }
  });
});

app.get('/test/lomadee', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api-beta.lomadee.com.br/affiliate/brands',
      {
        params: { limit: 1 },
        headers: { 'x-api-key': LOMADEE_APP_TOKEN },
        timeout: 10000
      }
    );
    
    res.json({
      success: true,
      message: 'Lomadee OK',
      brands: response.data.data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/test/hotmart', async (req, res) => {
  try {
    const tokenResponse = await axios.post(
      'https://api-sec-vlc.hotmart.com/security/oauth/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${HOTMART_BASIC_AUTH}`
        },
        timeout: 10000
      }
    );
    
    res.json({
      success: true,
      message: 'Hotmart OK',
      token: !!tokenResponse.data.access_token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/scrape/lomadee', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const response = await axios.get(
      'https://api-beta.lomadee.com.br/affiliate/brands',
      {
        params: { limit: limit, page: 1 },
        headers: { 'x-api-key': LOMADEE_APP_TOKEN },
        timeout: 30000
      }
    );
    
    const produtos = response.data.data.map(brand => ({
      titulo: brand.name,
      imagem: brand.logo,
      url: brand.site,
      comissao: brand.commission?.value || 0,
      marketplace: 'lomadee'
    }));
    
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

app.get('/scrape/hotmart', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    console.log('🔍 Hotmart: Obtendo token...');
    
    const tokenResponse = await axios.post(
      'https://api-sec-vlc.hotmart.com/security/oauth/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${HOTMART_BASIC_AUTH}`
        },
        timeout: 15000
      }
    );
    
    const token = tokenResponse.data.access_token;
    console.log('✅ Token obtido');
    
    console.log('🔍 Hotmart: Buscando produtos...');
    
    const response = await axios.get(
      'https://developers.hotmart.com/payments/api/v1/affiliates/products',
      {
        params: { rows: limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('Hotmart response:', JSON.stringify(response.data).substring(0, 200));
    
    // Verificar se items existe
    if (!response.data || !response.data.items || !Array.isArray(response.data.items)) {
      return res.json({
        success: false,
        error: 'Hotmart não retornou produtos no formato esperado',
        debug: response.data
      });
    }
    
    const produtos = response.data.items.map(p => ({
      titulo: p.name || 'Sem título',
