// API 1 – Node.js: Módulo de Sensores
// Em breve: cache com Redis
// Em breve: comunicação HTTP com a API Python

const express = require("express");
const redis = require("redis");
const axios = require("axios");

const app = express();
const port = 3000;

// Configuração do Cliente Redis
const redisClient = redis.createClient({
  // Se o Redis estiver rodando em um host/porta diferente ou com senha, configure aqui:
  // host: 'meu-redis-host',
  // port: 6379,
  // password: 'minha-senha'
});

redisClient.on("error", (err) => console.log("Erro no Cliente Redis", err));
(async () => {
  await redisClient.connect();
})();

app.use(express.json());

// Endpoint: /sensor-data
app.get("/sensor-data", async (req, res) => {
  const cacheKey = "sensor-data";
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Dados do sensor retornados do cache.");
      return res.json(JSON.parse(cachedData));
    }

    // Simula a obtenção de dados de sensores
    const sensorData = {
      temperature: Math.random() * 100, // Temperatura em Celsius
      pressure: Math.random() * 1000, // Pressão em kPa
      timestamp: new Date().toISOString(),
    };

    // Armazena no cache por 1 minuto (60 segundos)
    await redisClient.setEx(cacheKey, 60, JSON.stringify(sensorData));
    console.log("Novos dados do sensor gerados e cacheados.");
    res.json(sensorData);
  } catch (error) {
    console.error("Erro ao buscar dados do sensor:", error);
    res.status(500).send("Erro interno ao processar a solicitação.");
  }
});

// Endpoint: /alert
app.post("/alert", async (req, res) => {
  const alertData = req.body;
  if (!alertData || Object.keys(alertData).length === 0) {
    return res.status(400).send("Corpo da requisição de alerta está vazio.");
  }

  console.log("Alerta recebido:", alertData);

  try {
    // Envia o alerta para a API Python (Módulo de Eventos Críticos)
    // Certifique-se de que a API Python esteja rodando e acessível em http://localhost:5000/event
    const pythonApiUrl = "http://localhost:5000/event"; // Ajuste se a URL for diferente
    await axios.post(pythonApiUrl, alertData);
    console.log("Alerta enviado para a API Python com sucesso.");
    res
      .status(200)
      .send({
        message:
          "Alerta recebido e encaminhado para a API de Eventos Críticos.",
        data: alertData,
      });
  } catch (error) {
    console.error("Erro ao enviar alerta para a API Python:", error.message);
    // Verifica se o erro é de conexão para dar uma mensagem mais específica
    if (error.code === "ECONNREFUSED") {
      res.status(503).send("Serviço da API de Eventos Críticos indisponível.");
    } else {
      res.status(500).send("Erro interno ao encaminhar o alerta.");
    }
  }
});

app.listen(port, () => {
  console.log(`API de Sensores (Node.js) rodando em http://localhost:${port}`);
});
