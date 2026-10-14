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
4. [Consumidor de respaldo en Python](#consumidor-de-respaldo-en-python)
5. [Estructura de carpetas](#estructura-de-carpetas)
6. [Cómo ejecutarlo](#cómo-ejecutarlo)
7. [Cómo agregar un canal nuevo](#cómo-agregar-un-canal-nuevo)
8. [Estado](#estado)

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
    EX -. sms .-> QS[["cola<br/>event.drivent.sms"]]
    EX -. whatsapp .-> QW[["cola<br/>event.drivent.whatsapp"]]
    QE --> CN["EmailConsumer<br/>Node.js"]
    QE --> CP["EmailConsumer<br/>Python (respaldo)"]
    QS -.-> SC[SmsConsumer]
    QW -.-> WC[WhatsappConsumer]
```

| Elemento | Nombre | Para qué |
|---|---|---|
| Exchange | `event.drivent.exchange` (tipo `direct`) | Recibe todos los mensajes y los reparte según la *routing key*. |
| Cola de correo | `event.drivent.email` | Mensajes con routing key `email`. Es la que usa el backend hoy. |
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
    C->>C: consumeMessage(mensaje)
    C-)Est: notificación (hoy se registra en el log, correo real en #21)
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
        +suscribe()
        +consumeMessage(message)
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
    NotificationPublisher --> AmqpBroker
    ConsumerFactory ..> IConsumer : crea
```

| Pieza | Archivo | Qué hace |
|---|---|---|
| `AmqpBroker` | `src/classes/amqpBroker.ts` | Envuelve `amqplib`: se conecta (reintenta cada segundo si falla), declara el exchange, las colas y los bindings definidos en `RABBIT_CONFIG`, publica y consume. |
| `RABBIT_CONFIG` | `src/constants/rabbit.constant.ts` | Topología en un solo lugar: URL, exchange, colas y bindings. |
| `Consumer` | `src/consumer/consumer.service.ts` | Clase abstracta con lo común: inicializar el broker y suscribirse a una cola. Deja `consumeMessage` para cada canal (**Template Method**). |
| `EmailConsumer`, `SmsConsumer`, `WhatsappConsumer` | `src/consumer/` | Cada canal define su cola y qué hacer con el mensaje. |
| `ConsumerFactory` | `src/factory/consumer.factory.ts` | Devuelve el consumidor según el argumento de la línea de comandos (**Factory**). |
| `index.consumer.ts` | `src/` | Lee el canal (`email`, `sms`, `whatsapp`), pide el consumidor a la fábrica y se suscribe. |
| `NotificationPublisher` | `src/publisher/publisher.service.ts` | Publica mensajes de prueba en los tres canales, para probar sin el backend. |

Como `index.consumer.ts` depende de la interfaz `IConsumer` y no de una clase concreta, agregar un canal no obliga a cambiar el punto de entrada.

## Consumidor de respaldo en Python

Está en `python/` y hace lo mismo que el de Node para la cola de correo. Sirve como alternativa si el consumidor de Node no está disponible y como ejemplo de que cualquier lenguaje puede consumir la misma cola.

| Pieza | Archivo | Qué hace |
|---|---|---|
| `QueueHandler` | `queue/queue.py` | Modelo de Pydantic que se conecta con `pika`, declara el exchange `direct` y la cola durable, la enlaza con la routing key y consume. Confirma cada mensaje (`basic_ack`) después de procesarlo y recibe de a uno (`prefetch_count = 1`). |
| `Consumer` | `consumer/consumer.py` | Clase abstracta con el método `send(properties, body)`. |
| `EmailConsumer` | `consumer/email.py` | Implementación para correo. |
| `NewConsumer` | `consumer/new.py` | Fábrica que devuelve el consumidor según el tipo. |
| `main.py` | | Lee el tipo, arma la configuración de la cola y arranca el `QueueHandler`. |

Confirmar el mensaje después de procesarlo significa que, si el proceso se cae a mitad de camino, RabbitMQ vuelve a entregar el mensaje y no se pierde la notificación.

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

### 2. Consumidor en Node.js

Requiere Node.js 20 (ver `node/.nvmrc`).

```bash
cd node
npm install
cp .env.example .env
# en .env descomentar: AMQP_URL="amqp://admin:admin@localhost:5673/"
npm run start:consumer -- email
```

Para probar sin el backend, en otra terminal: `npm run dev:publisher`. Publica un mensaje en cada canal y el consumidor de correo muestra el suyo en el log.

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

Con el backend corriendo, `POST http://localhost:3001/ms-logica-negocio/api/convocation/sendNotification` con un texto en el cuerpo publica en la routing key `email`, y el consumidor lo muestra.

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
| El backend publica un evento en cada cambio de estado de una solicitud | ⏳ [#20](https://github.com/SemilleroSOLID/clean-architecture-api/issues/20) |
| Envío real del correo al estudiante (hoy el consumidor solo registra el mensaje en el log) | ⏳ [#21](https://github.com/SemilleroSOLID/clean-architecture-api/issues/21) |

El backlog completo está en los [issues de clean-architecture-api](https://github.com/SemilleroSOLID/clean-architecture-api/issues). Explicación del código de RabbitMQ: [artículo en Medium](https://medium.com/@santiagogranadaaguirre/d7849ab0c2b6).

---

<p align="center">Semillero SOLID · Universidad de Caldas</p>
