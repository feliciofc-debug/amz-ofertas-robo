// server.js - VERSÃO ORIGINAL E PURA DA CLAUDE
const express = require('express');
const playwright = require('playwright-core');
const chromium = require('chrome-aws-lambda');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'AMZ Ofertas Robô - Playwright Edition',
    timestamp: new Date().toISOString()
  });
});

app.get('/test-browser', async (req, res) => {
  let browser = null;
  try {
    console.log('🚀 Iniciando navegador...');
    
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath, // ESTA É A LINHA CORRETA
      headless: chromium.headless,
    });
    
    console.log('✅ Navegador iniciado!');
    
    const page = await browser.newPage();
    await page.goto('https://example.com' );
    const title = await page.title();
    
    console.log('✅ Página carregada:', title);
    
    await browser.close();
    
    res.json({ 
      success: true, 
      message: 'Navegador funcionando!',
      pageTitle: title
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    if (browser) await browser.close();
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
