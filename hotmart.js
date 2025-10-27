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
      message: 'Hotmart OK',
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
    
    if (!response.data || !response.data.items) {
      return {
        success: false,
        error: 'Hotmart não retornou produtos',
        debug: response.data
      };
    }
    
    const produtos = response.data.items.map(p => ({
      titulo: p.name || 'Sem título',
      preco: p.price?.value || 0,
      imagem: p.image || null,
      url: p.affiliateLink || null,
      comissao: p.commission?.value || 0,
      marketplace: 'hotmart'
    }));
    
    return {
      success: true,
      total: produtos.length,
      produtos: produtos
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
}

module.exports = { testarHotmart, scraparHotmart };
