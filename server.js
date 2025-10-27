const express = require('express');
const { testarLomadee, scraparLomadee } = require('./lomadee');
const { testarHotmart, scraparHotmart } = require('./hotmart');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const LOMADEE_APP_TOKEN = process.env.LOMADEE_APP_TOKEN;
const HOTMART_BASIC_AUTH = process.env.HOTMART_BASIC_AUTH;

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'AMZ Ofertas API - Modular',
    endpoints: {
      test_lomadee: '/test/lomadee',
      test_hotmart: '/test/hotmart',
      lomadee: '/scrape/lomadee?limit=20',
      hotmart: '/scrape/hotmart?limit=20'
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

app.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
});
