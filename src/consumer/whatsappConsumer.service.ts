import { ConsumeMessage } from "amqplib";
import { WHATSAPP_QUEUE } from "../constants/rabbit.constant";
import logger from "../utils/logger/logger.util";
import { Consumer } from "./consumer.service";
import { IConsumer } from "~/interfaces/consumer.interface";

export class WhatsappConsumer extends Consumer implements IConsumer {
  constructor() {
    super();
  }

  async suscribe(): Promise<void> {
    return super.suscribe(WHATSAPP_QUEUE);
  }

  async consumeMessage(message: ConsumeMessage): Promise<void> {
    try {
      logger.info("Whatsapp consumer: " + message.content.toString());
    } catch (error) {
      logger.error(error);
    }
  }
}
