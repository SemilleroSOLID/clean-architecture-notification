from typing import Callable

import pika.channel
import pika.credentials
from pydantic import BaseModel, PrivateAttr
import pika

class QueueCredentials(BaseModel):
    user: str
    passw: str

class QueueHandler(BaseModel):
    queue: str
    on_message: Callable
    credentials: QueueCredentials

    host: str = "localhost"
    port: int = 5672
    prefetch_count: int = 1

    _connection: pika.BlockingConnection = PrivateAttr(None)
    _channel: pika.adapters.blocking_connection.BlockingChannel = PrivateAttr(None)

    def callback(self, channel, method, properties, body):
        self.on_message(properties, body)
        channel.basic_ack(delivery_tag=method.delivery_tag)

    def suscribe(self):
        if not self._connection:
            credentials = pika.PlainCredentials(username=self.credentials.user, password=self.credentials.passw)
            connection_parameters = pika.ConnectionParameters(host=self.host, port=self.port, credentials=credentials)
            self._connection = pika.BlockingConnection(connection_parameters)

        if not self._channel:
            self._channel = self._connection.channel()
            self._channel.queue_declare(queue=self.queue, durable=True)
            self._channel.basic_qos(prefetch_count=self.prefetch_count)

        self._channel.basic_consume(queue=self.queue, on_message_callback=self.callback)

        print("Starting consuming...")
        self._channel.start_consuming()

    def close(self):
        if self._channel:
            self._channel.stop_consuming()

        if self._connection:
            self._connection.close()
