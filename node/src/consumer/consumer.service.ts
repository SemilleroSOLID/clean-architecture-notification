import { ConsumeMessage } from "amqplib";
import { AmqpBroker } from "../classes";
import { RABBIT_CONFIG } from "../constants/rabbit.constant";
import logger from "../utils/logger/logger.util";

export abstract class Consumer {
  constructor(protected amqp: AmqpBroker = new AmqpBroker(RABBIT_CONFIG)) {}
  async suscribe(queue: string): Promise<void> {
    try {
      await this.amqp.init();
      await this.amqp.addConsume(queue, this.handle.bind(this));
    } catch (error) {
      logger.error(error);
    }
  }

  // An error with one message never stops the consumer; the message is acknowledged once it was processed.
  private async handle(message: ConsumeMessage | null): Promise<void> {
    if (message === null) return;
    try {
      await this.consumeMessage(message);
    } catch (error) {
      logger.error(error);
    } finally {
      this.amqp.ack(message);
    }
  }
  async close(): Promise<void> {
    try {
      await this.amqp.close();
    } catch (error) {
      logger.error(error);
    }
  }
  abstract consumeMessage(message: ConsumeMessage): Promise<void>;
}
