import { ConsumeMessage } from "amqplib";
import { AmqpBroker } from "../classes";
import { RABBIT_CONFIG } from "../constants/rabbit.constant";
import logger from "../utils/logger/logger.util";

export abstract class Consumer {
  constructor(private amqp: AmqpBroker = new AmqpBroker(RABBIT_CONFIG)) {}
  async suscribe(queue: string): Promise<void> {
    try {
      await this.amqp.init();
      await this.amqp.addConsume(queue, this.consumeMessage.bind(this));
    } catch (error) {
      logger.error(error);
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
