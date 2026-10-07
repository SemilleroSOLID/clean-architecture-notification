# Event Driven

Event driven example with RabbitMQ

## SetUp

Requiere docker compose

```bash
docker compose up -d
```

This starts RabbitMQ (`event-driven-rabbitmq`):

| Port    | Use                                                  |
|---------|------------------------------------------------------|
| `5673`  | AMQP (used by this consumer and by `clean-architecture-api`) |
| `15673` | Management UI: http://localhost:15673 (`admin` / `admin`) |

## Installation

Requiere node v20 (see `.nvmrc`)

```bash
npm i
cp .env.example .env
```

In `.env` uncomment `AMQP_URL="amqp://admin:admin@localhost:5673/"` to use the local RabbitMQ.

> On Windows, if `ts-node` is not recognized, `node_modules` was installed from another OS (Linux/Docker).
> Delete `node_modules` and run `npm i` again.

## Usage

For exect the publisher

```bash
npm run dev:publisher
```

For lauch a consumer:

```bash
npm run start:consumer -- ("whatsapp" | "sms" | "email")
```

The `clean-architecture-api` publishes to the `email` routing key (`POST /convocation/sendNotification`),
so run `npm run start:consumer -- email` to see those messages.

## Links

[RabbitMQ code explanation](https://medium.com/@santiagogranadaaguirre/d7849ab0c2b6)

# How to run project with ngrok?

1. To start the RabbitMQ: `docker compose up -d`
2. Open TCP socket with ngrok: `ngrok tcp 5673`
3. In this folder: `docker build . -t solid-notifications-node`
4. And run: `docker run -e AMQP_URL=amqp://admin:admin@0.tcp.ngrok.io:18191 solid-notifications-node:latest`
5. Go to consumer fallback folder: `cd consumer-fallback`
6. Run: `docker build . -t solid-notifications-py`
7. And then run: `docker run -e RMQ_HOST=0.tcp.ngrok.io -e RMQ_PORT=18191 -e PYTHONUNBUFFERED=1 solid-notifications-py:latest`