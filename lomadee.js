const axios = require('axios');

async function testarLomadee(token) {
  try {
    const response = await axios.get(
      'https://api-beta.lomadee.com.br/affiliate/brands',
      {
        params: { limit: 1 },
        headers: { 'x-api-key': token },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      message: 'Lomadee OK',
      brands: response.data.data?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function scraparLomadee(token, limit = 20) {
  try {
    const response = await axios.get(
      'https://api-beta.lomadee.com.br/affiliate/brands',
      {
        params: { limit: limit, page: 1 },
        headers: { 'x-api-key': token },
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
    
    return {
      success: true,
      total: produtos.length,
      produtos: produtos
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { testarLomadee, scraparLomadee };
