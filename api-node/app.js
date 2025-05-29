const express = require("express");
const redis = require("redis");
const axios = require("axios");

const app = express();
const port = 3000;

const redisClient = redis.createClient({
});

redisClient.on("error", (err) => console.log("Erro no Cliente Redis", err));
(async () => {
  await redisClient.connect();
})();

app.use(express.json());

app.get("/sensor-data", async (req, res) => {
  const cacheKey = "sensor-data";
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log("Dados do sensor retornados do cache.");
      return res.json(JSON.parse(cachedData));
    }

    const sensorData = {
      temperature: Math.random() * 100,
      pressure: Math.random() * 1000,
      timestamp: new Date().toISOString(),
    };

    await redisClient.setEx(cacheKey, 60, JSON.stringify(sensorData));
    console.log("Novos dados do sensor gerados e cacheados.");
    res.json(sensorData);
  } catch (error) {
    console.error("Erro ao buscar dados do sensor:", error);
    res.status(500).send("Erro interno ao processar a solicitação.");
  }
});

app.post("/alert", async (req, res) => {
  const alertData = req.body;
  if (!alertData || Object.keys(alertData).length === 0) {
    return res.status(400).send("Corpo da requisição de alerta está vazio.");
  }

  console.log("Alerta recebido:", alertData);

  try {
    const pythonApiUrl = "http://localhost:5000/event";
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
