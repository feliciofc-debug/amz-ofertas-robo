const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURAÇÕES
// ============================================
const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN;
const HOTMART_BASIC_AUTH = process.env.HOTMART_BASIC_AUTH;

// ============================================
// HOME
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'AMZ Ofertas - Lomadee + Hotmart (API Nova)',
    timestamp: new Date().toISOString(),
    endpoints: {
      lomadee: '/scrape/lomadee?limit=20',
      hotmart: '/scrape/hotmart?categoria=marketing&limit=20',
      test_lomadee: '/test/lomadee',
      test_hotmart: '/test/hotmart'
    }
  });
});

// ============================================
// LOMADEE - NOVA API
// ============================================
app.get('/scrape/lomadee', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    console.log(`🔍 Lomadee: Buscando brands...`);
    
    const response = await axios.get(
      'https://api-beta.lomadee.com.br/affiliate/brands',
      {
        params: {
          limit: limit,
          page: 1
        },
        headers: {
          'x-api-key': LOMADEE_APP_TOKEN
        },
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
    console.error('❌ Erro Lomadee:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      error: 'Falha ao buscar dados da Lomadee.',
      details: error.response ? error.response.data : error.message
    });
  }
});

// ============================================
// HOTMART
// ============================================
app.get('/scrape/hotmart', async (req, res) => {
  try {
    const { categoria = 'desenvolvimento', limit = 20 } = req.query;
    
    console.log(`🔍 Hotmart: Buscando por categoria "${categoria}"`);
    
    const tokenResponse = await axios.post(
      'https://api-sec-vlc.hotmart.com/security/oauth/token',
      `grant_type=client_credentials`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${HOTMART_BASIC_AUTH}`
        },
        timeout: 15000
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Token Hotmart obtido');
    
    const response = await axios.get(
      'https://developers.hotmart.com/payments/api/v1/affiliates/products',
      {
        params: {
          rows: limit,
          categoryCode: categoria
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    if (!response.data || !response.data.items) {
      throw new Error('Hotmart API retornou resposta inválida');
    }
    
    const produtos = response.data.items.map(produto => {
      const preco = produto.price?.value || 0;
      const comissao = produto.commission?.value || 0;
      
      return {
        titulo: produto.name,
        preco: parseFloat(preco),
        imagem_url: produto.image || null,
        produto_url: produto.affiliateLink || `https://hotmart.com/product/${produto.id}`,
        produtor: produto.producerName || 'N/A',
        tipo: 'digital',
        categoria: categoria,
        comissao_valor: parseFloat(comissao),
        marketplace: 'hotmart',
        temperatura: produto.temperature || 'cold',
        amz_score: calcularAMZScoreHotmart({
          preco: preco,
          comissao: comissao,
          temperatura: produto.temperature
        })
      };
    });
    
    produtos.sort((a, b) => b.amz_score - a.amz_score);
    
    res.json({
      success: true,
      total: produtos.length,
      marketplace: 'hotmart',
      categoria: categoria,
      produtos: produtos
    });
    
  } catch (error) {
    console.error('❌ Erro Hotmart:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      error: 'Falha ao buscar dados da Hotmart.',
      details: error.response ? error.response.data : error.message
    });
  }
});

// ============================================
// TESTES
// ============================================
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
      message: 'Lomadee conectado com sucesso! (Nova API)',
      total_brands: response.data.data?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Falha na conexão com a Lomadee.',
      error: error.response ? error.response.data : error.message
    });
  }
});

app.get('/test/hotmart', async (req, res) => {
  try {
    const tokenResponse = await axios.post(
      'https://api-sec-vlc.hotmart.com/security/oauth/token',
      `grant_type=client_credentials`,
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
      message: 'Hotmart conectado com sucesso!',
      token_obtido: !!tokenResponse.data.access_token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Falha na conexão com a Hotmart.',
      error: error.response ? error.response.data : error.message
    });
  }
});

// ============================================
// FUNÇÕES AMZ SCORE
// ============================================
function calcularAMZScoreHotmart(produto) {
  let score = 0;
  
  if (produto.comissao >= 200) score += 50;
  else if (produto.comissao >= 100) score += 40;
  else if (produto.comissao >= 50) score += 30;
  else if (produto.comissao >= 20) score += 20;
  
  if (produto.temperatura === 'hot') score += 30;
  else if (produto.temperatura === 'warm') score += 20;
  else if (produto.temperatura === 'cold') score += 10;
  
  if (produto.preco >= 500) score += 20;
  else if (produto.preco >= 300) score += 15;
  else if (produto.preco >= 100) score += 10;
  else if (produto.preco >= 50) score += 5;
  
  return Math.min(score, 100);
}

// ============================================
// START
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 AMZ Ofertas na porta ${PORT}`);
  console.log(`📡 Lomadee (Nova API) + Hotmart`);
});
```

---

## 🔧 NO RENDER - REMOVA ESTA VARIÁVEL:

Vá em **Environment** e **DELETE:**
```
LOMADEE_SOURCE_ID
