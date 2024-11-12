from .consumer import Consumer, ConsumerType

class EmailConsumer(Consumer):
    type: ConsumerType = ConsumerType.EMAIL

    def send(self, properties, body):
        print(properties, body)
