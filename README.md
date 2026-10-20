<h1 align="center">clean-architecture-notification</h1>

<p align="center">
  Microservicio de notificaciones del <b>Sistema de Convocatorias</b> de la Universidad de Caldas · Semillero SOLID<br/>
  Ejemplo de <b>arquitectura orientada a eventos</b> con RabbitMQ
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=rabbitmq,nodejs,ts,py,docker" alt="Tecnologías de notificaciones" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/RabbitMQ-3.8-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white" alt="RabbitMQ 3.8" />
  <img src="https://img.shields.io/badge/Node.js-20-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 20" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11" />
  <img src="https://img.shields.io/badge/Pydantic-2-E92063?style=for-the-badge&logo=pydantic&logoColor=white" alt="Pydantic 2" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
</p>

---

Este repositorio recibe los eventos que publica el backend ([clean-architecture-api](https://github.com/SemilleroSOLID/clean-architecture-api)) y se encarga de notificar a los estudiantes. La **documentación general del sistema** (arquitectura completa, estados, diagramas) está en el README del backend; aquí se explica cómo funciona este servicio por dentro.

## Contenido

1. [Por qué un servicio aparte](#por-qué-un-servicio-aparte)
2. [Cómo está conectado RabbitMQ](#cómo-está-conectado-rabbitmq)
3. [Consumidor en Node.js](#consumidor-en-nodejs)
4. [El correo al estudiante](#el-correo-al-estudiante)
5. [Consumidor de respaldo en Python](#consumidor-de-respaldo-en-python)
6. [Estructura de carpetas](#estructura-de-carpetas)
7. [Cómo ejecutarlo](#cómo-ejecutarlo)
8. [Cómo agregar un canal nuevo](#cómo-agregar-un-canal-nuevo)
9. [Estado](#estado)

## Por qué un servicio aparte

Cuando el administrador aprueba o rechaza una solicitud, el estudiante debe recibir un correo. Si el backend lo enviara directamente, la respuesta al administrador tendría que esperar al servidor de correo, y si ese servidor fallara, fallaría también la aprobación.

Con eventos, el backend solo **publica un mensaje** en RabbitMQ y responde de inmediato. Este servicio **consume** el mensaje cuando puede y envía la notificación.

| Sin eventos | Con eventos (este proyecto) |
|---|---|
| El backend espera a que salga el correo. | El backend publica y sigue. |
| Si el correo falla, falla la operación. | Si el consumidor está caído, el mensaje espera en la cola. |
| Agregar SMS o WhatsApp obliga a cambiar el backend. | Se agrega un consumidor nuevo sin tocar el backend. |

## Cómo está conectado RabbitMQ

```mermaid
flowchart LR
    API["clean-architecture-api<br/>RabbitMQSender"] -- "routing key: email" --> EX{{"exchange<br/>event.drivent.exchange<br/>(direct)"}}
    PUB["Publisher de prueba<br/>(node)"] -. "email · sms · whatsapp" .-> EX
    EX -- email --> QE[["cola<br/>event.drivent.email"]]
    EX -- email.failed --> QF[["cola<br/>event.drivent.email.failed"]]
    EX -. sms .-> QS[["cola<br/>event.drivent.sms"]]
    EX -. whatsapp .-> QW[["cola<br/>event.drivent.whatsapp"]]
    QE --> CN["EmailConsumer<br/>Node.js"]
    QE --> CP["EmailConsumer<br/>Python (respaldo)"]
    CN -- SMTP --> MP["Mailpit<br/>(desarrollo)"]
    CN -. "no se pudo procesar" .-> EX
    QS -.-> SC[SmsConsumer]
    QW -.-> WC[WhatsappConsumer]
```

| Elemento | Nombre | Para qué |
|---|---|---|
| Exchange | `event.drivent.exchange` (tipo `direct`) | Recibe todos los mensajes y los reparte según la *routing key*. |
| Cola de correo | `event.drivent.email` | Mensajes con routing key `email`. Es la que usa el backend hoy. |
| Cola de fallidos | `event.drivent.email.failed` | Mensajes mal formados o correos que no se pudieron enviar tras los reintentos, para revisarlos. |
| Colas de SMS y WhatsApp | `event.drivent.sms`, `event.drivent.whatsapp` | Preparadas en el código; sus bindings están comentados en `rabbit.constant.ts`. |

Un exchange `direct` envía cada mensaje a la cola cuya *binding key* coincide exactamente con la *routing key*. Así el backend decide el canal solo con la clave, sin conocer las colas.

### Flujo de un mensaje

```mermaid
sequenceDiagram
    autonumber
    participant API as clean-architecture-api
    participant EX as Exchange direct
    participant Q as Cola event.drivent.email
    participant C as EmailConsumer
    actor Est as Estudiante

    API->>EX: publish(routing key "email", mensaje)
    Note over API: Responde al usuario sin esperar
    EX->>Q: enruta por la clave "email"
    Q-)C: entrega el mensaje cuando el consumidor está conectado
    C->>C: consumeMessage(mensaje): valida el evento y arma el correo
    C-)Est: correo por SMTP (Mailpit en desarrollo)
    C->>Q: ack
```

## Consumidor en Node.js

Está en `node/` y es el consumidor principal. Usa `amqplib` para hablar con RabbitMQ y `winston` para el log.

```mermaid
classDiagram
    direction LR
    class IConsumer {
        <<interface>>
        +suscribe()
        +close()
    }
    class Consumer {
        <<abstract>>
        -AmqpBroker amqp
        +suscribe(queue)
        +close()
        +consumeMessage(message)*
    }
    class EmailConsumer {
        -IMailer mailer
        +suscribe()
        +consumeMessage(message)
    }
    class SmtpMailer {
        +send(email)
    }
    class SmsConsumer
    class WhatsappConsumer
    class ConsumerFactory {
        email
        sms
        whatsapp
    }
    class AmqpBroker {
        +init()
        +connect()
        +send(exchange, key, msg)
        +addConsume(queue, callback)
        +ack(message)
        +close()
    }
    class NotificationPublisher {
        +connect()
        +publish(exchange, key, message)
        +close()
    }

    IConsumer <|.. EmailConsumer
    IConsumer <|.. SmsConsumer
    IConsumer <|.. WhatsappConsumer
    Consumer <|-- EmailConsumer
    Consumer <|-- SmsConsumer
    Consumer <|-- WhatsappConsumer
    Consumer --> AmqpBroker
    EmailConsumer --> SmtpMailer : nodemailer
    NotificationPublisher --> AmqpBroker
    ConsumerFactory ..> IConsumer : crea
```

| Pieza | Archivo | Qué hace |
|---|---|---|
| `AmqpBroker` | `src/classes/amqpBroker.ts` | Envuelve `amqplib`: se conecta (reintenta cada segundo si falla), declara el exchange, las colas y los bindings definidos en `RABBIT_CONFIG`, publica y consume. |
| `RABBIT_CONFIG` | `src/constants/rabbit.constant.ts` | Topología en un solo lugar: URL, exchange, colas y bindings. |
| `Consumer` | `src/consumer/consumer.service.ts` | Clase abstracta con lo común: inicializar el broker, suscribirse a una cola y confirmar cada mensaje después de procesarlo, sin que un error detenga el consumidor. Deja `consumeMessage` para cada canal (**Template Method**). |
| `EmailConsumer` | `src/consumer/emailConsumer.service.ts` | Valida el evento, arma el correo, lo envía con reintentos y aparta lo que no se pudo procesar. |
| `SmsConsumer`, `WhatsappConsumer` | `src/consumer/` | Canales preparados; hoy solo registran el mensaje. |
| `parseRequestEvent` | `src/notification/requestEvent.ts` | Lee el JSON del evento o explica por qué no es válido. |
| `buildRequestEmail` | `src/notification/emailTemplates.ts` | Plantilla del correo (asunto, texto y HTML) según el estado. |
| `SmtpMailer` | `src/notification/mailer.ts` | Envía por SMTP con `nodemailer`, configurado por variables de entorno (`src/constants/mail.constant.ts`). |
| `ConsumerFactory` | `src/factory/consumer.factory.ts` | Devuelve el consumidor según el argumento de la línea de comandos (**Factory**). |
| `index.consumer.ts` | `src/` | Lee el canal (`email`, `sms`, `whatsapp`), pide el consumidor a la fábrica y se suscribe. |
| `NotificationPublisher` | `src/publisher/publisher.service.ts` | Publica mensajes de prueba, para probar sin el backend: un evento de ejemplo en `email` y texto en SMS y WhatsApp. |

Como `index.consumer.ts` depende de la interfaz `IConsumer` y no de una clase concreta, agregar un canal no obliga a cambiar el punto de entrada.

## El correo al estudiante

Desde [#21](https://github.com/SemilleroSOLID/clean-architecture-api/issues/21) el `EmailConsumer` de Node envía un correo real por cada evento `REQUEST_STATUS_CHANGED` del backend ([#20](https://github.com/SemilleroSOLID/clean-architecture-api/issues/20)), con `nodemailer`. En desarrollo el servidor SMTP es **Mailpit**: recibe todos los correos y los muestra en http://localhost:8025, sin que lleguen a un buzón real.

| `newState` | Asunto | Contenido |
|---|---|---|
| `ACTIVE` | Recibimos tu solicitud a {convocatoria} | Cumple todos los requisitos y queda en revisión. |
| `PENDING` | Recibimos tu solicitud a {convocatoria} | No cumple algún requisito, pero igual queda en revisión. |
| `ACCEPT` | Tu solicitud a {convocatoria} fue aprobada | Felicitaciones. |
| `REJECT` | Tu solicitud a {convocatoria} fue rechazada | **Incluye la justificación** del administrador. |
| `CANCELLED` | Retiraste tu solicitud a {convocatoria} | Ya no se considera para la selección. |

Cada correo va en texto y en HTML, saluda al estudiante por su nombre y tiene el enlace *Ver mis solicitudes* al front (`APP_URL`). Los datos del evento se escapan antes de ponerlos en el HTML.

### Qué pasa cuando algo falla

```mermaid
flowchart TD
    M[Mensaje de la cola event.drivent.email] --> P{¿Es un evento válido?}
    P -- no --> F[["cola event.drivent.email.failed<br/>con el motivo en el header reason"]]
    P -- sí --> S[Enviar el correo por SMTP]
    S -- enviado --> A[ack: sale de la cola]
    S -- falla --> R{¿Quedan intentos?<br/>EMAIL_MAX_ATTEMPTS}
    R -- sí, espera y reintenta --> S
    R -- no --> F
    F --> A
```

- **Mensaje mal formado** (no es JSON, no es el evento o le faltan datos como el correo): reintentarlo fallaría igual, así que se aparta en la cola `event.drivent.email.failed` y el consumidor sigue con el siguiente.
- **El SMTP falla:** se reintenta hasta `EMAIL_MAX_ATTEMPTS` veces (por defecto 3), esperando `EMAIL_RETRY_DELAY_MS` × intento entre cada uno. Si se agotan, el mensaje también va a la cola de fallidos.
- **Nunca se pierde un mensaje:** el consumidor confirma (`ack`) cada mensaje solo después de procesarlo y recibe de a uno (`prefetch 1`). Si el proceso se cae a mitad de un envío, RabbitMQ lo vuelve a entregar.
- En la cola de fallidos los mensajes se revisan desde el panel de RabbitMQ (*Queues → event.drivent.email.failed → Get messages*): el header `reason` dice por qué se apartó cada uno.

### Configuración SMTP

Todo se configura por variables de entorno en `node/.env` (ver `node/.env.example`). Los valores por defecto apuntan a Mailpit.

| Variable | Por defecto | Para qué |
|---|---|---|
| `SMTP_HOST` | `localhost` | Servidor SMTP. |
| `SMTP_PORT` | `1025` | Puerto SMTP (Mailpit usa 1025; un servidor real suele usar 587 o 465). |
| `SMTP_SECURE` | `false` | `true` solo para SMTP sobre TLS (puerto 465). |
| `SMTP_USER` / `SMTP_PASS` | vacíos | Credenciales; si `SMTP_USER` está vacío se envía sin autenticación. |
| `MAIL_FROM` | `Servicios Universidad de Caldas <notificaciones@ucaldas.test>` | Remitente. |
| `APP_URL` | `http://localhost:5173` | Front, para el enlace *Ver mis solicitudes*. |
| `EMAIL_MAX_ATTEMPTS` | `3` | Intentos de envío antes de apartar el mensaje. |
| `EMAIL_RETRY_DELAY_MS` | `2000` | Espera base entre intentos. |

Para enviar correos reales basta con cambiar estas variables por las de un servidor SMTP (por ejemplo el institucional), sin tocar el código.

## Consumidor de respaldo en Python

Está en `python/` y consume la misma cola de correo. **Decisión ([#21](https://github.com/SemilleroSOLID/clean-architecture-api/issues/21)): queda como respaldo que solo registra.** Lee el evento y escribe en consola un resumen (solicitud, estudiante, estado anterior y nuevo, motivo), pero **no envía correos**: las plantillas y el envío viven solo en el consumidor de Node, para no mantenerlos duplicados. Sirve para revisar los eventos si el de Node no está disponible y como ejemplo de que cualquier lenguaje puede consumir la misma cola.

> No ejecutes los dos consumidores a la vez: RabbitMQ reparte los mensajes entre ellos y los que tome el de Python no generarían correo.

| Pieza | Archivo | Qué hace |
|---|---|---|
| `QueueHandler` | `queue/queue.py` | Modelo de Pydantic que se conecta con `pika`, declara el exchange `direct` y la cola durable, la enlaza con la routing key y consume. Confirma cada mensaje (`basic_ack`) después de procesarlo y recibe de a uno (`prefetch_count = 1`). |
| `Consumer` | `consumer/consumer.py` | Clase abstracta con el método `send(properties, body)`. |
| `EmailConsumer` | `consumer/email.py` | Lee el evento y registra el resumen; descarta con un mensaje en consola lo que no sea un evento válido. |
| `NewConsumer` | `consumer/new.py` | Fábrica que devuelve el consumidor según el tipo. |
| `main.py` | | Lee el tipo, arma la configuración de la cola y arranca el `QueueHandler`. |

Confirmar el mensaje después de procesarlo significa que, si el proceso se cae a mitad de camino, RabbitMQ vuelve a entregar el mensaje y no se pierde la notificación. Un error con un mensaje se registra y no detiene el consumidor.

## Estructura de carpetas

```text
clean-architecture-notification/
├── node/                           ← consumidor principal
│   ├── docker-compose.yml          ← RabbitMQ (puertos 5673 y 15673)
│   ├── Dockerfile                  ← imagen del consumidor de correo
│   └── src/
│       ├── index.consumer.ts       ← entrada del consumidor
│       ├── index.publisher.ts      ← entrada del publisher de prueba
│       ├── classes/amqpBroker.ts   ← conexión y operaciones con RabbitMQ
│       ├── constants/              ← exchange, colas, bindings y URL
│       ├── consumer/               ← Consumer abstracto + Email, Sms, Whatsapp
│       ├── factory/                ← ConsumerFactory
│       ├── notification/           ← evento, plantillas del correo y SmtpMailer
│       ├── test/                   ← pruebas con node:test
│       ├── interfaces/             ← IConsumer, IPublisher, IAmqpConfig
│       ├── publisher/              ← NotificationPublisher
│       └── utils/logger/           ← winston
└── python/                         ← consumidor de respaldo
    ├── main.py
    ├── consumer/                   ← Consumer abstracto, EmailConsumer, fábrica
    └── queue/queue.py              ← QueueHandler con pika
```

## Cómo ejecutarlo

### 1. RabbitMQ

```bash
cd node
docker compose up -d
```

| Puerto | Uso |
|---|---|
| `5673` | AMQP, lo usan este servicio y el backend. |
| `15673` | Panel de administración: http://localhost:15673 (`admin` / `admin`). |
| `1025` | SMTP de Mailpit, donde el consumidor envía los correos. |
| `8025` | Buzón de Mailpit: http://localhost:8025. Los correos se guardan en un volumen y sobreviven a reinicios. |

### 2. Consumidor en Node.js

Requiere Node.js 20 (ver `node/.nvmrc`).

```bash
cd node
npm install
cp .env.example .env
npm run start:consumer -- email
```

`.env.example` ya trae `AMQP_URL` y la configuración SMTP de Mailpit. Si tu `.env` es anterior, agrega `AMQP_URL="amqp://admin:admin@localhost:5673/"`; las variables SMTP tienen valores por defecto.

Para probar sin el backend, en otra terminal: `npm run dev:publisher`. Publica un evento de ejemplo en la cola de correo (llega a Mailpit como *"Tu solicitud a Convocatoria de prueba fue aprobada"*) y texto en SMS y WhatsApp.

Pruebas (validación del evento, plantillas, reintentos y mensajes mal formados, con un SMTP simulado):

```bash
npm test
```

> En Windows, si `ts-node` no se reconoce, `node_modules` se instaló desde otro sistema operativo. Borra `node_modules` y ejecuta `npm install` otra vez.

### 3. Consumidor en Python (opcional)

Requiere Python 3.11 (ver `python/.python-version`).

```bash
cd python
pip install -r requirements.txt
cp .env.example .env
# en .env agregar: RMQ_HOST=localhost y RMQ_PORT=5673
python main.py email
```

### Probar con el backend

Con el backend corriendo, crear, aprobar, rechazar o retirar una solicitud publica en la routing key `email` un evento JSON; el consumidor envía el correo y lo puedes ver en http://localhost:8025 ([#20](https://github.com/SemilleroSOLID/clean-architecture-api/issues/20)):

```json
{"event":"REQUEST_STATUS_CHANGED","requestId":9,"studentId":4,"studentName":"Santiago Ramírez López","studentEmail":"santiago.ramirez@ucaldas.test","convocationId":3,"convocationTitle":"Residencia Estudiantil 2027","previousState":"PENDING","newState":"REJECT","comment":"El promedio mínimo para la residencia es 3.5","date":"2026-10-19T23:00:06-05:00"}
```

`previousState` es `null` cuando la solicitud se acaba de crear y `comment` trae la justificación de un rechazo. La descripción de cada campo está en el [README del API](https://github.com/SemilleroSOLID/clean-architecture-api#eventos-de-notificación). El antiguo endpoint de prueba `sendNotification`, que publicaba texto libre, ya no existe.

## Cómo agregar un canal nuevo

Ejemplo: notificaciones push.

1. En `rabbit.constant.ts`, agregar la cola, la routing key y su binding al exchange.
2. Crear `PushConsumer extends Consumer implements IConsumer` en `src/consumer/` con su `consumeMessage`.
3. Registrarlo en `ConsumerFactory` con la clave `push`.
4. Ejecutar `npm run start:consumer -- push`.

El backend solo tendría que publicar con la routing key `push`.

## Estado

| Tarea | Estado |
|---|---|
| Topología de RabbitMQ y consumidores de Node y Python | ✅ |
| El backend publica un evento en cada cambio de estado de una solicitud | ✅ [#20](https://github.com/SemilleroSOLID/clean-architecture-api/issues/20) |
| Envío real del correo al estudiante, con Mailpit en desarrollo, reintentos y cola de fallidos | ✅ [#21](https://github.com/SemilleroSOLID/clean-architecture-api/issues/21) |

El backlog completo está en los [issues de clean-architecture-api](https://github.com/SemilleroSOLID/clean-architecture-api/issues). Explicación del código de RabbitMQ: [artículo en Medium](https://medium.com/@santiagogranadaaguirre/d7849ab0c2b6).

---

<p align="center">Semillero SOLID · Universidad de Caldas</p>
