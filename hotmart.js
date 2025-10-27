const axios = require('axios');

async function testarHotmart(basicAuth) {
  try {
    const tokenResponse = await axios.post(
      'https://api-sec-vlc.hotmart.com/security/oauth/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
        },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      message: 'Hotmart OK - Token válido',
      token: !!tokenResponse.data.access_token
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function scraparHotmart(basicAuth, limit = 20) {
  try {
    console.log('🔍 Hotmart: Obtendo token...');
    
    const tokenResponse = await axios.post(
      'https://api-sec-vlc.hotmart.com/security/oauth/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`
        },
        timeout: 15000
      }
    );
    
    const token = tokenResponse.data.access_token;
    console.log('✅ Token obtido');
    
    // TENTAR MÚLTIPLOS ENDPOINTS
    const endpoints = [
      'https://developers.hotmart.com/payments/api/v1/affiliates/products',
      'https://developers.hotmart.com/payments/api/v1/sales/users/affiliations'
    ];
    
    let produtos = [];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Tentando endpoint: ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          params: { 
            rows: limit,
            page: 1
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        console.log('Resposta:', JSON.stringify(response.data).substring(0, 300));
        
        // Verificar diferentes estruturas de resposta
        const items = response.data.items || 
                     response.data.products || 
                     response.data.content || 
                     response.data.data || 
                     [];
        
        if (items && items.length > 0) {
          console.log(`✅ Encontrou ${items.length} produtos no endpoint: ${endpoint}`);
          
          produtos = items.map(p => ({
            titulo: p.name || p.product?.name || 'Sem título',
            preco: p.price?.value || p.product?.price || 0,
            imagem: p.image || p.product?.image || null,
            url: p.affiliateLink || p.product?.affiliateLink || `https://hotmart.com/product/${p.id}`,
            comissao: p.commission?.value || p.affiliateCommission || 0,
            produtor: p.producerName || p.product?.producerName || 'N/A',
            marketplace: 'hotmart',
            status: 'Vendas ativas'
          }));
          
          break; // Encontrou produtos, para o loop
        }
      } catch (err) {
        console.log(`⚠️ Erro no endpoint ${endpoint}:`, err.message);
        continue;
      }
    }
    
    if (produtos.length === 0) {
      return {
        success: false,
        error: 'Nenhum produto encontrado via API',
        info: 'Produtos podem levar até 24h para aparecer na API após aprovação',
        solucao_temporaria: 'Use a Lomadee enquanto aguarda sincronização da Hotmart',
        produtos_visiveis_no_painel: 11
      };
    }
    
    return {
      success: true,
      total: produtos.length,
      produtos: produtos
    };
    
  } catch (error) {
    console.error('❌ Erro Hotmart:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    };
  }
}

module.exports = { testarHotmart, scraparHotmart };
