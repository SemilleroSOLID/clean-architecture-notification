# Consumidor de notificaciones · Node.js

Consumidor principal del servicio de notificaciones, escrito en TypeScript con `amqplib` y `nodemailer`. La explicación de la arquitectura (exchange, colas, clases, correos y reintentos) está en el [README del repositorio](../README.md).

## Ejecutarlo

**Con todo el sistema:** el `docker compose up -d --build` de [clean-architecture-api](https://github.com/SemilleroSOLID/clean-architecture-api#empezar-rápido) ya levanta este consumidor. No hace falta instalar Node.

**Para desarrollarlo** con Node.js 20 (ver `.nvmrc`):

```bash
docker compose stop notification   # en clean-architecture-api, para que no haya dos consumidores
npm install
cp .env.example .env               # ya trae AMQP_URL y el SMTP de Mailpit
npm run start:consumer -- email
```

Si solo quieres trabajar en este servicio, sin el resto del sistema, `docker compose up -d` en esta carpeta levanta RabbitMQ y Mailpit (no lo hagas con el compose del API arriba: usan los mismos puertos).

> En Windows, si `ts-node` no se reconoce, `node_modules` se instaló desde otro sistema operativo. Borra `node_modules` y ejecuta `npm install` otra vez.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run start:consumer -- email` | Escucha la cola `event.drivent.email` y envía los correos. También acepta `sms` y `whatsapp`, que solo registran el mensaje. |
| `npm run dev:publisher` | Publica un evento de ejemplo en la cola de correo (llega a Mailpit) y texto en SMS y WhatsApp. |
| `npm test` | Pruebas con `node:test`: validación del evento, plantillas, reintentos y mensajes mal formados, con un SMTP simulado. |
| `npx tsc --noEmit -p .` | Revisa los tipos de TypeScript. |

`npm run lint` existe pero hoy no revisa nada; el motivo está en [Lo que no conviene copiar](../README.md#lo-que-no-conviene-copiar).
