const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURAÇÕES (usar variáveis de ambiente)
// ============================================
const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN;
const LOMADEE_SOURCE_ID = process.env.LOMADEE_SOURCE_ID;
const HOTMART_BASIC_AUTH = process.env.HOTMART_BASIC_AUTH;

// ============================================
// HOME
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'AMZ Ofertas - Lomadee + Hotmart',
    timestamp: new Date().toISOString(),
    endpoints: {
      lomadee: '/scrape/lomadee?query=notebook&limit=20',
      hotmart: '/scrape/hotmart?categoria=desenvolvimento&limit=20',
      test_lomadee: '/test/lomadee',
      test_hotmart: '/test/hotmart'
    }
  });
});

// ============================================
// LOMADEE - SCRAPING
// ============================================
app.get('/scrape/lomadee', async (req, res) => {
  try {
    const { query = 'notebook', limit = 20 } = req.query;
    
    console.log(`🔍 Lomadee: Buscando por "${query}" com limite de ${limit}`);
    
    const response = await axios.get(
      `https://api.lomadee.com/v3/${LOMADEE_SOURCE_ID}/offer/_search`,
      {
        params: {
          keyword: query,
          size: limit
        },
        headers: {
          'app-token': LOMADEE_APP_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
     );
    
    if (!response.data || !response.data.offers) {
      throw new Error('Lomadee API retornou uma resposta inesperada ou sem ofertas.');
    }
    
    const produtos = response.data.offers.map(offer => {
      const comissao = offer.price * (offer.commission / 100);
      
      return {
        titulo: offer.name,
        preco: parseFloat(offer.price),
        preco_original: offer.priceFrom ? parseFloat(offer.priceFrom) : null,
        imagem_url: offer.thumbnail?.url || null,
        produto_url: offer.link,
        loja: offer.store?.name || 'N/A',
        categoria: offer.category?.name || null,
        comissao_percentual: offer.commission,
        comissao_valor: parseFloat(comissao.toFixed(2)),
        marketplace: 'lomadee',
        amz_score: calcularAMZScore({
          preco: offer.price,
          preco_original: offer.priceFrom,
          comissao: comissao
        })
      };
    });
    
    produtos.sort((a, b) => b.amz_score - a.amz_score);
    
    res.json({
      success: true,
      total: produtos.length,
      marketplace: 'lomadee',
      query: query,
      produtos: produtos
    });
    
  } catch (error) {
    console.error('❌ Erro na API Lomadee:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      error: 'Falha ao buscar dados da Lomadee.',
      details: error.response ? error.response.data : error.message,
      dica: 'Verifique se LOMADEE_APP_TOKEN e LOMADEE_SOURCE_ID estão corretos nas variáveis de ambiente.'
    });
  }
});

// ============================================
// HOTMART - SCRAPING
// ============================================
app.get('/scrape/hotmart', async (req, res) => {
  try {
    const { categoria = 'desenvolvimento', limit = 20 } = req.query;
    
    console.log(`🔍 Hotmart: Buscando por categoria "${categoria}" com limite de ${limit}`);
    
    // 1. Obter token OAuth
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
    console.log('✅ Token de acesso da Hotmart obtido com sucesso.');
    
    // 2. Buscar produtos
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
      throw new Error('Hotmart API retornou uma resposta inesperada ou sem itens.');
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
        comissao_valor: parseFloat(comissao ),
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
    console.error('❌ Erro na API Hotmart:', error.response ? error.response.data : error.message);
    res.status(500).json({
      success: false,
      error: 'Falha ao buscar dados da Hotmart.',
      details: error.response ? error.response.data : error.message,
      dica: 'Verifique se HOTMART_BASIC_AUTH está correto nas variáveis de ambiente.'
    });
  }
});

// ============================================
// TESTES DE CONEXÃO
// ============================================
app.get('/test/lomadee', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.lomadee.com/v3/${LOMADEE_SOURCE_ID}/offer/_search`,
      {
        params: { keyword: 'teste', size: 1 },
        headers: { 'app-token': LOMADEE_APP_TOKEN, 'Content-Type': 'application/json' },
        timeout: 10000
      }
     );
    
    res.json({
      success: true,
      message: 'Lomadee conectado com sucesso!',
      total_ofertas_teste: response.data.offers?.length || 0
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
// FUNÇÕES DE CÁLCULO AMZ SCORE
// ============================================
function calcularAMZScore(produto) {
  let score = 0;
  
  if (produto.preco_original && produto.preco) {
    const desconto = ((produto.preco_original - produto.preco) / produto.preco_original) * 100;
    if (desconto >= 50) score += 40;
    else if (desconto >= 30) score += 30;
    else if (desconto >= 20) score += 20;
    else if (desconto >= 10) score += 10;
  }
  
  if (produto.comissao >= 100) score += 40;
  else if (produto.comissao >= 50) score += 30;
  else if (produto.comissao >= 20) score += 20;
  else if (produto.comissao >= 10) score += 10;
  
  if (produto.preco < 100) score += 20;
  else if (produto.preco < 300) score += 15;
  else if (produto.preco < 500) score += 10;
  else if (produto.preco < 1000) score += 5;
  
  return Math.min(score, 100);
}

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
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 AMZ Ofertas rodando na porta ${PORT}`);
  console.log(`📡 Lomadee + Hotmart integrados`);
  console.log(`⚡ Ultra-rápido (sem navegador)`);
});
