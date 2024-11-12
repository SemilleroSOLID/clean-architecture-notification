import { ConsumeMessage } from "amqplib";
import { EMAIL_QUEUE } from "../constants/rabbit.constant";
import logger from "../utils/logger/logger.util";
import { Consumer } from "./consumer.service";
import { IConsumer } from "../interfaces/consumer.interface";

export class EmailConsumer extends Consumer implements IConsumer {
  constructor() {
    super();
  }

  async suscribe(): Promise<void> {
    return super.suscribe(EMAIL_QUEUE);
  }

  async consumeMessage(message: ConsumeMessage): Promise<void> {
    try {
      logger.info("Email consumer: " + message.content.toString());
    } catch (error) {
      logger.error(error);
    }
  }
}
