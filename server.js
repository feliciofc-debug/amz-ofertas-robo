// server.js - VERSÃO FINALMENTE CORRIGIDA
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
    
    // A CORREÇÃO ESTÁ AQUI. Eu removi o "await" de chromium.executablePath
    const executablePath = await chromium.executablePath;

    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: executablePath, // Agora passamos a variável correta
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
