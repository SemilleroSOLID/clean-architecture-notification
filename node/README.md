# Consumidor de notificaciones · Node.js

Consumidor principal del servicio de notificaciones, escrito en TypeScript con `amqplib`. La explicación de la arquitectura (exchange, colas, clases y patrones) está en el [README del repositorio](../README.md).

## Instalación

Requiere Node.js 20 (ver `.nvmrc`) y Docker.

```bash
docker compose up -d          # RabbitMQ en 5673, panel en http://localhost:15673 (admin / admin)
npm install
cp .env.example .env          # descomentar AMQP_URL="amqp://admin:admin@localhost:5673/"
```

> En Windows, si `ts-node` no se reconoce, `node_modules` se instaló desde otro sistema operativo (Linux o Docker). Borra `node_modules` y ejecuta `npm install` otra vez.

## Uso

| Comando | Qué hace |
|---|---|
| `npm run start:consumer -- email` | Escucha la cola `event.drivent.email`. También acepta `sms` y `whatsapp`. |
| `npm run dev:publisher` | Publica un mensaje de prueba en cada canal y se cierra a los 5 segundos. |
| `npm run lint` | Revisa el código con TSLint. |

El backend (`clean-architecture-api`) publica con la routing key `email`, así que para ver sus mensajes se usa `npm run start:consumer -- email`.

## Ejecutar con Docker y ngrok

Sirve para conectar un consumidor que corre en otra máquina con el RabbitMQ local.

1. Levantar RabbitMQ: `docker compose up -d`
2. Abrir un túnel TCP: `ngrok tcp 5673`
3. Construir la imagen: `docker build . -t solid-notifications-node`
4. Ejecutarla con la dirección del túnel: `docker run -e AMQP_URL=amqp://admin:admin@0.tcp.ngrok.io:18191 solid-notifications-node:latest`
5. Para el consumidor de Python: `cd ../python`, `docker build . -t solid-notifications-py` y `docker run -e RMQ_HOST=0.tcp.ngrok.io -e RMQ_PORT=18191 -e PYTHONUNBUFFERED=1 solid-notifications-py:latest`
