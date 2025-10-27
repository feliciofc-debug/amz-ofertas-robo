// server.js - SOLUÇÃO 1 DA CLAUDE (@sparticuz/chromium)
const express = require('express');
const playwright = require('playwright-core');
const chromium = require('@sparticuz/chromium');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'AMZ Ofertas Robô - Playwright + Sparticuz',
    timestamp: new Date().toISOString()
  });
});

app.get('/test-browser', async (req, res) => {
  let browser = null;
  try {
    console.log('🚀 Iniciando navegador...');
    console.log('Chromium args:', chromium.args);
    
    const executablePath = await chromium.executablePath();
    console.log('Executable path:', executablePath);
    
    browser = await playwright.chromium.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: chromium.headless,
    });
    
    console.log('✅ Navegador iniciado!');
    
    const page = await browser.newPage();
    await page.goto('https://example.com', { timeout: 30000 } );
    const title = await page.title();
    
    console.log('✅ Página carregada:', title);
    
    await browser.close();
    
    res.json({ 
      success: true, 
      message: 'Navegador funcionando com @sparticuz/chromium!',
      pageTitle: title
    });
    
  } catch (error) {
    console.error('❌ Erro completo:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Erro ao fechar navegador:', e.message);
      }
    }
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
