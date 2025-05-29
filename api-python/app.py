import json
import redis
import pika
import threading
from flask import Flask, request, jsonify

app = Flask(__name__)

eventos = []

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
CACHE_KEY_EVENTS = "critical_events"
CACHE_EXPIRATION_SECONDS = 60 * 5

RABBITMQ_HOST = 'localhost'
RABBITMQ_QUEUE = 'logistica_urgente'

@app.route('/event', methods=['POST'])
def receive_event():
    try:
        event_data = request.get_json()
        if not event_data:
            return jsonify({"error": "Corpo da requisição está vazio"}), 400
        
        print(f"Evento recebido da API Node.js: {event_data}")
        eventos.append(event_data)
        
        try:
            redis_client.setex(CACHE_KEY_EVENTS, CACHE_EXPIRATION_SECONDS, json.dumps(eventos))
            print("Cache de eventos atualizado no Redis.")
        except redis.exceptions.ConnectionError as e:
            print(f"Erro ao conectar com o Redis para cachear evento: {e}")
        return jsonify({"message": "Evento recebido com sucesso", "data": event_data}), 201
    except Exception as e:
        print(f"Erro ao processar evento: {e}")
        return jsonify({"error": "Erro interno ao processar o evento"}), 500

@app.route('/events', methods=['GET'])
def get_events():
    try:
        cached_events = redis_client.get(CACHE_KEY_EVENTS)
        if cached_events:
            print("Eventos retornados do cache Redis.")
            return jsonify(json.loads(cached_events)), 200
        
        print("Eventos retornados da memória e cacheados no Redis.")
        redis_client.setex(CACHE_KEY_EVENTS, CACHE_EXPIRATION_SECONDS, json.dumps(eventos))
        return jsonify(eventos), 200
    except redis.exceptions.ConnectionError as e:
        print(f"Erro ao conectar com o Redis para buscar eventos: {e}")
        print("Eventos retornados da memória (Redis indisponível).")
        return jsonify(eventos), 200
    except Exception as e:
        print(f"Erro ao buscar eventos: {e}")
        return jsonify({"error": "Erro interno ao buscar eventos"}), 500

def consume_rabbitmq_messages():
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)

        def callback(ch, method, properties, body):
            message = body.decode()
            print(f" [x] Mensagem recebida do RabbitMQ ({RABBITMQ_QUEUE}): {message}")
            try:
                event_data = json.loads(message)
                eventos.append({"source": "rabbitmq", "data": event_data, "type": "logistics_dispatch"})
                try:
                    redis_client.setex(CACHE_KEY_EVENTS, CACHE_EXPIRATION_SECONDS, json.dumps(eventos))
                    print("Cache de eventos atualizado no Redis após mensagem do RabbitMQ.")
                except redis.exceptions.ConnectionError as e:
                    print(f"Erro ao conectar com o Redis para cachear evento do RabbitMQ: {e}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except json.JSONDecodeError:
                print(f"Erro ao decodificar JSON da mensagem: {message}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            except Exception as e:
                print(f"Erro ao processar mensagem do RabbitMQ: {e}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=RABBITMQ_QUEUE, on_message_callback=callback)

        print(f' [*] Aguardando mensagens na fila {RABBITMQ_QUEUE}. Para sair pressione CTRL+C')
        channel.start_consuming()
    except pika.exceptions.AMQPConnectionError as e:
        print(f"Erro ao conectar com RabbitMQ: {e}. Tentando reconectar em alguns segundos...")
    except Exception as e:
        print(f"Erro inesperado no consumidor RabbitMQ: {e}")

if __name__ == '__main__':
    rabbitmq_thread = threading.Thread(target=consume_rabbitmq_messages, daemon=True)
    rabbitmq_thread.start()

    print("API de Eventos Críticos (Python) iniciada. Executando em http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
