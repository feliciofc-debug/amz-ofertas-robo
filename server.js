// SERVER.JS - VERSÃO COM IA MARKETING (GEMINI)
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // <-- Adicionado para futuras integrações
const { GoogleGenerativeAI } = require("@google/generative-ai"); // <-- 1. IMPORTAR A IA

// Importar módulos existentes
const { testarLomadee, scraparLomadee } = require('./lomadee');
const { testarHotmart, scraparHotmart } = require('./hotmart');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DAS CHAVES E VARIÁVEIS ---
const PORT = process.env.PORT || 3000;
const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN;
const HOTMART_BASIC_AUTH = process.env.HOTMART_BASIC_AUTH;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // <-- 2. PEGAR A CHAVE DO GEMINI

// --- INICIALIZAÇÃO DA IA ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- ROTAS EXISTENTES (INTOCADAS) ---
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'AMZ Ofertas API - v5 com IA Marketing', // Versão atualizada
    endpoints: {
      test_lomadee: '/test/lomadee',
      test_hotmart: '/test/hotmart',
      scrape_lomadee: '/scrape/lomadee?limit=20',
      scrape_hotmart: '/scrape/hotmart?limit=20',
      ia_marketing: 'POST /analisar-produto' // Novo endpoint
    }
  });
});

app.get('/test/lomadee', async (req, res) => {
  const resultado = await testarLomadee(LOMADEE_APP_TOKEN);
  res.json(resultado);
});

app.get('/test/hotmart', async (req, res) => {
  const resultado = await testarHotmart(HOTMART_BASIC_AUTH);
  res.json(resultado);
});

app.get('/scrape/lomadee', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const resultado = await scraparLomadee(LOMADEE_APP_TOKEN, limit);
  res.json(resultado);
});

app.get('/scrape/hotmart', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const resultado = await scraparHotmart(HOTMART_BASIC_AUTH, limit);
  res.json(resultado);
});

// --- NOVAS ROTAS E FUNÇÕES DA "IA MARKETING" ---

// ENDPOINT PRINCIPAL DA IA
app.post('/analisar-produto', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL do produto é obrigatória.' });
    }
    
    console.log(`🤖 [IA] Analisando URL: ${url}`);
    
    // 1. Extrair informações do link (usando mock por enquanto)
    const produto = await extrairInfoProduto(url);
    
    // 2. Calcular o Score de Conversão
    const score = calcularScoreConversao(produto);
    
    // 3. Gerar os posts com a IA Gemini
    const posts = await gerarPostsIA(produto);
    
    // 4. Enviar a resposta completa para o frontend
    res.json({
      success: true,
      produto: produto,
      score_conversao: score,
      posts: posts
    });
    
  } catch (error) {
    console.error('❌ [IA] Erro no endpoint /analisar-produto:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Falha ao analisar o produto com a IA.' 
    });
  }
});

// FUNÇÃO MOCK PARA EXTRAIR DADOS DO PRODUTO (A SER MELHORADA NO FUTURO)
async function extrairInfoProduto(url) {
  console.log(`[IA] Extraindo dados (mock) da URL: ${url}`);
  // No futuro, aqui entrará o scraping real da URL
  return {
    titulo: "Notebook Gamer SuperPower X15",
    preco: 4999.90,
    imagem: "https://i.zst.com.br/thumbs/12/3/3b/1880495348.jpg", // Imagem de exemplo
    avaliacao: 4.8,
    vendas: 1523
  };
}

// FUNÇÃO PARA CALCULAR O SCORE DE CONVERSÃO
function calcularScoreConversao(produto ) {
  let score = 5.0; // Score base
  if (produto.avaliacao >= 4.5) score += 2;
  if (produto.vendas >= 1000) score += 2;
  if (produto.preco >= 100 && produto.preco <= 500) score += 1;
  return Math.min(score, 10); // Garante que o score não passe de 10
}

// FUNÇÃO QUE USA A IA DO GEMINI PARA GERAR OS TEXTOS
async function gerarPostsIA(produto) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Prompt para o post do Instagram
    const promptInsta = `Crie um post de no máximo 150 caracteres para Instagram sobre o produto '${produto.titulo}' que custa R$${produto.preco}. Use 3 emojis e uma chamada para ação clara.`;
    const resultInsta = await model.generateContent(promptInsta);
    const textoInsta = resultInsta.response.text();
    
    // Prompt para a mensagem do WhatsApp
    const promptWhats = `Crie uma mensagem curta para WhatsApp, como se fosse um amigo indicando o produto '${produto.titulo}' por R$${produto.preco}. Use emojis e termine com 'Confere aí:'.`;
    const resultWhats = await model.generateContent(promptWhats);
    const textoWhats = resultWhats.response.text();
    
    console.log("[IA] Textos gerados com sucesso pelo Gemini.");
    
    return {
      instagram: textoInsta.trim(),
      story: `🔥 OFERTA IMPERDÍVEL 🔥\n\n${produto.titulo}\n\nPor apenas R$ ${produto.preco}!\n\nArrasta pra cima! 👆`,
      whatsapp: textoWhats.trim()
    };
    
  } catch (error) {
    console.error('❌ [IA] Erro ao gerar conteúdo com o Gemini:', error);
    // Plano B: Se a IA falhar, retorna um texto padrão
    return {
      instagram: `🔥 Imperdível! ${produto.titulo} por apenas R$ ${produto.preco}! Corra e aproveite. Link na bio! 🚀`,
      story: `OFERTA RELÂMPAGO!\n${produto.titulo}\nR$ ${produto.preco}`,
      whatsapp: `Meu amigo, olha essa oferta que eu achei: ${produto.titulo} por R$ ${produto.preco}! 🔥 Imperdível!`
    };
  }
}

// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor do Reino rodando na porta ${PORT}`);
});
