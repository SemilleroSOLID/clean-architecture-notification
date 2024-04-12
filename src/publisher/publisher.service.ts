import { AmqpBroker } from "../classes";
import { RABBIT_CONFIG } from "../constants/rabbit.constant";
import { IPublisher } from "../interfaces/producer.interface";
import logger from "../utils/logger/logger.util";

export class NotificationPublisher implements IPublisher {
  constructor(private amqp: AmqpBroker = new AmqpBroker(RABBIT_CONFIG)) {}
  async connect(): Promise<void> {
    try {
      await this.amqp.init();
    } catch (error) {
      logger.error(error);
    }
  }
  publish(exchangeName: string, key: string, message: object | string): void {
    this.amqp.send(exchangeName, key, message);
  }

  async close(): Promise<void> {
    try {
      await this.amqp.close();
    } catch (error) {
      logger.error(error);
    }
  }
}
