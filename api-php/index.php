<?php

require_once __DIR__ . '/vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

define('RABBITMQ_HOST', 'localhost');
define('RABBITMQ_PORT', 5672);
define('RABBITMQ_USER', 'guest');
define('RABBITMQ_PASSWORD', 'guest');
define('RABBITMQ_QUEUE', 'logistica_urgente');

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '/';

if ($method === 'GET' && $path === '/equipments') {
    getEquipments();
} elseif ($method === 'POST' && $path === '/dispatch') {
    dispatchEquipment();
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint não encontrado']);
}

function getEquipments()
{
    $equipments = [
        ['id' => 1, 'name' => 'Bomba Submersível XPTO', 'status' => 'disponível'],
        ['id' => 2, 'name' => 'Gerador Elétrico 500KVA', 'status' => 'em manutenção'],
        ['id' => 3, 'name' => 'Sonda de Perfuração R2D2', 'status' => 'disponível'],
        ['id' => 4, 'name' => 'Válvula de Segurança P12', 'status' => 'em trânsito']
    ];
    echo json_encode($equipments);
}

function dispatchEquipment()
{
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input) || !isset($input['equipment_id']) || !isset($input['destination'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Dados inválidos para dispatch. É necessário equipment_id e destination.']);
        return;
    }

    $messageBody = json_encode([
        'event_type' => 'LOGISTICS_DISPATCH_REQUEST',
        'payload' => $input,
        'timestamp' => date('c')
    ]);

    try {
        $connection = new AMQPStreamConnection(RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD);
        $channel = $connection->channel();

        $channel->queue_declare(RABBITMQ_QUEUE, false, true, false, false);

        $msg = new AMQPMessage(
            $messageBody,
            ['delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT]
        );

        $channel->basic_publish($msg, '', RABBITMQ_QUEUE);

        $channel->close();
        $connection->close();

        http_response_code(202);
        echo json_encode([
            'message' => 'Solicitação de dispacho de equipamento enviada para a fila.',
            'data_sent' => $input
        ]);

    } catch (\Exception $e) {
        error_log("Erro ao enviar mensagem para RabbitMQ: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro interno ao processar a solicitação de dispatch.', 'details' => $e->getMessage()]);
    }
}

?>
