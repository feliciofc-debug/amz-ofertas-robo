// SERVER.JS - VERSÃO COM IA MARKETING (GEMINI) + OAUTH META
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { testarLomadee, scraparLomadee } = require('./lomadee');
const { testarHotmart, scraparHotmart } = require('./hotmart');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN;
const HOTMART_BASIC_AUTH = process.env.HOTMART_BASIC_AUTH;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'https://amz-ofertas-robo.onrender.com/auth/callback/meta';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.amzofertas.com.br';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'AMZ Ofertas API - v6 com OAuth Meta',
    endpoints: {
      test_lomadee: '/test/lomadee',
      test_hotmart: '/test/hotmart',
      scrape_lomadee: '/scrape/lomadee?limit=20',
      scrape_hotmart: '/scrape/hotmart?limit=20',
      ia_marketing: 'POST /analisar-produto',
      auth_instagram: '/auth/instagram/connect?user_id={id}',
      auth_callback: '/auth/callback/meta'
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

app.post('/analisar-produto', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL do produto é obrigatória.' });
    }
    console.log(`🤖 [IA] Analisando URL: ${url}`);
    const produto = await extrairInfoProduto(url);
    const score = calcularScoreConversao(produto);
    const posts = await gerarPostsIA(produto);
    res.json({
      success: true,
      produto: produto,
      score_conversao: score,
      posts: posts
    });
  } catch (error) {
    console.error('❌ [IA] Erro no endpoint /analisar-produto:', error.message);
    res.status(500).json({ success: false, error: 'Falha ao analisar o produto com a IA.' });
  }
});

async function extrairInfoProduto(url) {
  console.log(`[IA] Extraindo dados (mock) da URL: ${url}`);
  return {
    titulo: "Notebook Gamer SuperPower X15",
    preco: 4999.90,
    imagem: "https://i.zst.com.br/thumbs/12/3/3b/1880495348.jpg",
    avaliacao: 4.8,
    vendas: 1523
  };
}

function calcularScoreConversao(produto) {
  let score = 5.0;
  if (produto.avaliacao >= 4.5) score += 2;
  if (produto.vendas >= 1000) score += 2;
  if (produto.preco >= 100 && produto.preco <= 500) score += 1;
  return Math.min(score, 10);
}

async function gerarPostsIA(produto) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const promptInsta = `Crie um post de no máximo 150 caracteres para Instagram sobre o produto '${produto.titulo}' que custa R$${produto.preco}. Use 3 emojis e uma chamada para ação clara.`;
    const resultInsta = await model.generateContent(promptInsta);
    const textoInsta = resultInsta.response.text();
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
    return {
      instagram: `🔥 Imperdível! ${produto.titulo} por apenas R$ ${produto.preco}! Corra e aproveite. Link na bio! 🚀`,
      story: `OFERTA RELÂMPAGO!\n${produto.titulo}\nR$ ${produto.preco}`,
      whatsapp: `Meu amigo, olha essa oferta que eu achei: ${produto.titulo} por R$ ${produto.preco}! 🔥 Imperdível!`
    };
  }
}

app.get('/auth/instagram/connect', (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id é obrigatório' });
    }
    if (!META_APP_ID || !META_APP_SECRET) {
      console.error('❌ [OAuth] Credenciais Meta não configuradas!');
      return res.status(500).json({ success: false, error: 'Credenciais Meta não configuradas no servidor' });
    }
    const scopes = ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'].join(',');
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&scope=${scopes}&response_type=code&state=${user_id}`;
    console.log(`✅ [OAuth] Redirecionando usuário ${user_id} para autenticação Meta`);
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ [OAuth] Erro na rota /auth/instagram/connect:', error);
    res.status(500).json({ success: false, error: 'Erro ao iniciar autenticação' });
  }
});

app.get('/auth/callback/meta', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    const userId = state;
    if (error) {
      console.error(`❌ [OAuth] Usuário negou permissões: ${error_description}`);
      return res.redirect(`${FRONTEND_URL}/redes-sociais?error=access_denied`);
    }
    if (!code) {
      console.error('❌ [OAuth] Código de autorização não recebido');
      return res.redirect(`${FRONTEND_URL}/redes-sociais?error=no_code`);
    }
    // Troca o code por access_token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`;
    const response = await axios.get(tokenUrl);
    const accessToken = response.data.access_token;
    // Você pode salvar o access_token na conta do usuário ou redirecionar para o frontend com ele
    return res.redirect(`${FRONTEND_URL}/redes-sociais?success=meta&access_token=${accessToken}`);
  } catch (err) {
    console.error('❌ [OAuth] Erro durante callback Meta:', err.message);
    return res.redirect(`${FRONTEND_URL}/redes-sociais?error=callback_failed`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
