# Event Driven

Event driven example with RabbitMQ

## SetUp

Requiere docker-compose

```bash
docker-compose up -d
```

## Installation

Requiere node v14

```bash
npm i
```

## Usage

For exect the publisher

```bash
npm run dev:publisher
```

For lauch a consumer:

```bash
npm run start:consumer -- ("whatsapp" | "sms" | "email")
```

## Links

[RabbitMQ code explanation](https://medium.com/@santiagogranadaaguirre/d7849ab0c2b6)

# How to run project?

1. To start the RabbitMQ: `docker compose up -d`
2. Open TCP socket with ngrok: `ngrok tcp 5673`
3. In this folder: `docker build . -t solid-notifications-node`
4. And run: `docker run -e AMQP_URL=amqp://admin:admin@0.tcp.ngrok.io:18191 solid-notifications-node:latest`
5. Go to consumer fallback folder: `cd consumer-fallback`
6. Run: `docker build . -t solid-notifications-py`
7. And then run: `docker run -e RMQ_HOST=0.tcp.ngrok.io -e RMQ_PORT=18191 -e PYTHONUNBUFFERED=1 solid-notifications-py:latest`