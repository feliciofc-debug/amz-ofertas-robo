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
    console.log('✅ Token obtido:', token.substring(0, 20) + '...');
    
    console.log('🔍 Hotmart: Buscando produtos (tentativa 1 - com categoria)...');
    
    // TENTATIVA 1: Com categoria
    let response = await axios.get(
      'https://developers.hotmart.com/payments/api/v1/affiliates/products',
      {
        params: { 
          rows: limit,
          categoryCode: 'BUSINESS'
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('Resposta da API:', JSON.stringify(response.data).substring(0, 500));
    
    // Se não retornou, tenta sem categoria
    if (!response.data || !response.data.items || response.data.items.length === 0) {
      console.log('⚠️ Sem resultados com categoria. Tentando sem categoria...');
      
      response = await axios.get(
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
    }
    
    console.log('Total de items:', response.data.items?.length || 0);
    
    if (!response.data || !response.data.items || response.data.items.length === 0) {
      return {
        success: false,
        error: 'Sua conta Hotmart pode não ter produtos disponíveis ainda',
        info: 'Verifique se você é um afiliado aprovado ou se precisa aceitar alguns produtos primeiro',
        debug: {
          hasData: !!response.data,
          hasItems: !!response.data?.items,
          itemsLength: response.data?.items?.length || 0
        }
      };
    }
    
    const produtos = response.data.items.map(p => ({
      titulo: p.name || 'Sem título',
      preco: p.price?.value || 0,
      imagem: p.image || null,
      url: p.affiliateLink || null,
      comissao: p.commission?.value || 0,
      produtor: p.producerName || 'N/A',
      marketplace: 'hotmart'
    }));
    
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
      details: error.response?.data || null,
      dica: 'Verifique se você é um afiliado aprovado na Hotmart'
    };
  }
}

module.exports = { testarHotmart, scraparHotmart };
