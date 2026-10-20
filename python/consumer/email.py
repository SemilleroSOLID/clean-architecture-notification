import json

from .consumer import Consumer, ConsumerType

REQUIRED_FIELDS = ("requestId", "studentName", "studentEmail", "convocationTitle", "newState")


class EmailConsumer(Consumer):
    """Fallback: reads the event of the api (#20) and logs it. The emails are sent by the Node consumer (#21)."""
    type: ConsumerType = ConsumerType.EMAIL

    def send(self, properties, body):
        try:
            event = json.loads(body)
        except ValueError:
            print("Mensaje descartado (no es JSON):", body)
            return
        missing = [field for field in REQUIRED_FIELDS if not isinstance(event, dict) or not event.get(field)]
        if missing:
            print("Mensaje descartado (faltan " + ", ".join(missing) + "):", body)
            return
        print(
            f"Solicitud {event['requestId']} de {event['studentName']} <{event['studentEmail']}> "
            f"en \"{event['convocationTitle']}\": {event.get('previousState') or '(nueva)'} -> {event['newState']}"
            + (f" - motivo: {event['comment']}" if event.get("comment") else "")
            + " (correo no enviado: el respaldo solo registra)"
        )
