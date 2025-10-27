const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURAÇÕES (usar variáveis de ambiente)
// ============================================
const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN || 'SEU_TOKEN_AQUI';
const LOMADEE_SOURCE_ID = process.env.LOMADEE_SOURCE_ID || 'SEU_SOURCE_ID_AQUI';

const HOTMART_CLIENT_ID = process.env.HOTMART_CLIENT_ID || 'SEU_CLIENT_ID_AQUI';
const HOTMART_CLIENT_SECRET = process.env.HOTMART_CLIENT_SECRET || 'SEU_CLIENT_SECRET_AQUI';
const HOTMART_BASIC_AUTH = process.env.HOTMART_BASIC_AUTH || 'SEU_BASIC_AUTH_AQUI';

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
    
    console.log(`🔍 Lomadee: ${query}`);
    
    const response = await axios.get(
      `https://api.lomadee.com/v3/${LOMADEE_SOURCE_ID}/offer/_search`,
      {
        params: {
          keyword: query,
          size: limit
        },
        headers: {
          'app_token': LOMADEE_APP_TOKEN
        },
        timeout: 30000
      }
    );
    
    if (!response.data || !response.data.offers) {
      throw new Error('Lomadee retornou dados inválidos');
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
    
    // Ordenar por AMZ Score
    produtos.sort((a, b) => b.amz_score - a.amz_score);
    
    res.json({
      success: true,
      total: produtos.length,
      marketplace: 'lomadee',
      query: query,
      produtos: produtos
    });
    
  } catch (error) {
    console.error('❌ Lomadee:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      dica: 'Verifique LOMADEE_APP_TOKEN e LOMADEE_SOURCE_ID nas variáveis de ambiente'
    });
  }
});

// ============================================
// HOTMART - SCRAPING
// ============================================
app.get('/scrape/hotmart', async (req, res) => {
  try {
    const { categoria = 'desenvolvimento', limit = 20 } = req.query;
    
    console.log(`🔍 Hotmart: ${categoria}`);
    
    // 1. Obter token OAuth
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
    
    const accessToken = tokenResponse.data.access_token;
    
    console.log('✅ Token Hotmart obtido');
    
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
      throw new Error('Hotmart retornou dados inválidos');
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
    
    // Ordenar por AMZ Score
    produtos.sort((a, b) => b.amz_score - a.amz_score);
    
    res.json({
      success: true,
      total: produtos.length,
      marketplace: 'hotmart',
      categoria: categoria,
      produtos: produtos
    });
    
  } catch (error) {
    console.error('❌ Hotmart:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      dica: 'Verifique HOTMART_CLIENT_ID, CLIENT_SECRET e BASIC_AUTH nas variáveis de ambiente'
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
        headers: { 'app_token': LOMADEE_APP_TOKEN },
        timeout: 10000
      }
    );
    
    res.json({
      success: true,
      message: 'Lomadee conectado com sucesso!',
      total_ofertas: response.data.offers?.length || 0
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
      message: 'Hotmart conectado com sucesso!',
      token_obtido: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// FUNÇÕES DE CÁLCULO AMZ SCORE
// ============================================
function calcularAMZScore(produto) {
  let score = 0;
  
  // Desconto (peso 40%)
  if (produto.preco_original && produto.preco) {
    const desconto = ((produto.preco_original - produto.preco) / produto.preco_original) * 100;
    if (desconto >= 50) score += 40;
    else if (desconto >= 30) score += 30;
    else if (desconto >= 20) score += 20;
    else if (desconto >= 10) score += 10;
  }
  
  // Comissão (peso 40%)
  if (produto.comissao >= 100) score += 40;
  else if (produto.comissao >= 50) score += 30;
  else if (produto.comissao >= 20) score += 20;
  else if (produto.comissao >= 10) score += 10;
  
  // Preço (peso 20%)
  if (produto.preco < 100) score += 20;
  else if (produto.preco < 300) score += 15;
  else if (produto.preco < 500) score += 10;
  else if (produto.preco < 1000) score += 5;
  
  return Math.min(score, 100);
}

function calcularAMZScoreHotmart(produto) {
  let score = 0;
  
  // Comissão (peso 50%)
  if (produto.comissao >= 200) score += 50;
  else if (produto.comissao >= 100) score += 40;
  else if (produto.comissao >= 50) score += 30;
  else if (produto.comissao >= 20) score += 20;
  
  // Temperatura (peso 30%)
  if (produto.temperatura === 'hot') score += 30;
  else if (produto.temperatura === 'warm') score += 20;
  else if (produto.temperatura === 'cold') score += 10;
  
  // Preço (peso 20%)
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
```

---

## 3. CONFIGURAR CREDENCIAIS NO RENDER

No painel do Render, vá em **Environment** e adicione:

### **LOMADEE:**
```
LOMADEE_APP_TOKEN=seu_token_aqui
LOMADEE_SOURCE_ID=seu_source_id_aqui
```

**Onde conseguir:**
1. Acesse: https://www.lomadee.com/
2. Faça login/cadastro
3. Vá em: Ferramentas → API
4. Copie: App Token e Source ID

### **HOTMART:**
```
HOTMART_CLIENT_ID=seu_client_id
HOTMART_CLIENT_SECRET=seu_client_secret
HOTMART_BASIC_AUTH=seu_basic_auth_base64
```

**Onde conseguir:**
1. Acesse: https://app-vlc.hotmart.com/
2. Configurações → Integrações → API
3. Crie aplicação OAuth
4. Para BASIC_AUTH: `echo -n "CLIENT_ID:CLIENT_SECRET" | base64`

---

## 4. LINKS PARA TESTAR
```
https://amz-ofertas-robo.onrender.com/test/lomadee
https://amz-ofertas-robo.onrender.com/test/hotmart
https://amz-ofertas-robo.onrender.com/scrape/lomadee?query=iphone&limit=10
https://amz-ofertas-robo.onrender.com/scrape/hotmart?categoria=marketing&limit=10
