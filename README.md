Aluno: Vitor Henrique Camillo - RGM: 31382096

Explicação do Projeto de Microsserviços
 O projeto de microsserviços que simula um ecossistema digital de uma operação de extração e transporte de petróleo. O projeto é dividido em três partes, cada uma representando um serviço específico, e utiliza tecnologias como Node.js, Python, PHP, Redis e RabbitMQ para comunicação e cache.

Introdução
o projeto simula um sistema de monitoramento e logística de uma operação de extração de petróleo, onde sensores coletam dados, eventos críticos são gerenciados e a logística de transporte é controlada. As APIs são desenvolvidas em diferentes linguagens para demonstrar a interoperabilidade entre serviços.

API de Sensores: Simula sensores em poços de petróleo.

API de Eventos Críticos: Gerencia alertas críticos.

API de Logística: Controla o transporte de equipamentos.

APIs que compõem o projeto

1. API de Sensores (Node.js)
   Funcionalidade: Simula sensores instalados nos poços de petróleo, fornecendo dados de temperatura e pressão, e enviando alertas.

Como executar:
  - Vá até a pasta api-node.
  - Execute node app.js ou npm start.

Endpoints:
  - GET /sensor-data: Volta os dados de temperatura e pressão.
  - POST /alert: Envia um alerta para a API de Eventos Críticos.

2. API de Eventos Críticos (Python)
   Funcionalidade: Recebe alertas da API de Sensores, armazena-os temporariamente e consome mensagens de logística do RabbitMQ.

Como executar:
  - Vá até a pasta api-python.
  - Execute python app.py.

Endpoints:
  - POST /event: Recebe um alerta da API Node.js e o salva.
  - GET /events: Retorna todos os eventos recebidos.

3. API de Logística (PHP)
   Funcionalidade: Gerencia o transporte de peças e equipamentos, publicando mensagens urgentes no RabbitMQ.

Como executar:
  - Vá até a pasta api-php.
  - Execute php -S localhost:8000 -t .

Endpoints:
  - GET /equipments: Retorna para uma lista de equipamentos.
  - POST /dispatch: Envia uma mensagem de logística urgente para uma fila no RabbitMQ.

Comunicação entre APIs
API Node.js -> API Python: A API de Sensores envia alertas para a API de Eventos Críticos através de uma chamada HTTP.

API PHP -> API Python (via RabbitMQ): A API de Logística envia mensagens para uma fila no RabbitMQ. A API de Eventos Críticos puxa mensagens dessa fila.

Uso do Cache Redis
API de Sensores (Node.js): Os dados de temperatura e pressão fornecidos pelo sensor /sensor-data serão cacheados usando Redis para melhorar o desempenho e reduzir a carga de processamento para dados.

API de Eventos Críticos (Python): A lista de eventos retornada pelo endpoint /events será cacheada usando Redis para fornecer acesso rápido aos eventos já registrados.

Fluxo com RabbitMQ
 A API de Logística (PHP), Recebe uma requisição na rota /dispatch, manda uma mensagem em uma fila específica no RabbitMQ.

A API de Eventos Críticos (Python) Ela tem um consumidor que fica escutando essa fila no RabbitMQ.

Quando uma nova mensagem chega na fila, o consumidor da API Python a processa.

Ferramentas Necessárias
Node.js (com npm)

Python (com pip)

PHP

Redis: Para cache.

RabbitMQ: Para mensageria assíncrona.

Docker
Use docker para facilitar na execução, e para rodar o rabbitMQ e o Redis, você pode usar os seguintes comandos:

# Para executar o Redis

docker run -d --name redis -p 6379:6379 redis

# Para executar o RabbitMQ

docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
