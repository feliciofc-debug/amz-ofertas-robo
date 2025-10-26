// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Robô Garimpeiro AMZ Ofertas está no ar!');
});

app.listen(PORT, () => {
  console.log(`Servidor do robô rodando na porta ${PORT}`);
});
