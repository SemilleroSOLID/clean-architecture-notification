# Consumidor de respaldo · Python

Consumidor alternativo para la cola de correo, escrito con `pika` y `pydantic`. Lee el evento del backend y registra un resumen en consola; **no envía correos** (eso lo hace el consumidor de Node). No lo ejecutes a la vez que el de Node. La explicación de cómo encaja en el sistema está en el [README del repositorio](../README.md).

## Instalación

Se recomienda [pyenv](https://github.com/pyenv/pyenv). Si no lo usas, instala la versión indicada en `.python-version` (3.11).

```bash
pyenv install
pyenv virtualenv venv
pyenv activate venv
pip install -r requirements.txt
cp .env.example .env
```

En `.env`, además del usuario y la contraseña, define dónde está RabbitMQ:

| Variable | Valor local |
|---|---|
| `RMQ_USER` | `admin` |
| `RMQ_PASS` | `admin` |
| `RMQ_HOST` | `localhost` |
| `RMQ_PORT` | `5673` |

## Uso

Con RabbitMQ corriendo (`docker compose up -d` en `../node`):

```bash
python main.py email
```

El consumidor declara el exchange y la cola si no existen, recibe los mensajes de a uno y confirma cada uno después de procesarlo.
