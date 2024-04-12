# event-driven

Event driven example with RabbitMQ

## SetUp

requiere docker-compose

```bash
docker-compose up -d
```

## Installation

requiere node v14

```bash
npm i
```

## Usage

For exect the publisher

```bash
npm run dev:publisher
```

for lauch a consumer:

```bash
npm run start:consumer -- ("whatsapp" | "sms" | "email")
```
