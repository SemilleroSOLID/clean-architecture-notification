import { ConsumeMessage } from "amqplib";
import { AmqpBroker } from "../classes";
import { RABBIT_CONFIG, SMS_QUEUE } from "../constants/rabbit.constant";
import { IConsumer } from "../interfaces/consumer.interface";
import logger from "../utils/logger/logger.util";
import { Consumer } from "./consumer.service";

export class SmsConsumer extends Consumer implements IConsumer {
  constructor() {
    super();
  }

  async suscribe(): Promise<void> {
    return super.suscribe(SMS_QUEUE);
  }

  async consumeMessage(message: ConsumeMessage): Promise<void> {
    try {
      logger.info("Sms consumer: " + message.content.toString());
    } catch (error) {
      logger.error(error);
    }
  }
}
