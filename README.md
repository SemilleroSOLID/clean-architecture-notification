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
