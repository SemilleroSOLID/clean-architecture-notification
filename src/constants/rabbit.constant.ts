import "dotenv/config";
import { IAmqpConfig } from "../interfaces/amqpConfig.interface";

export const EXCHANGE_NAME = "event.drivent.exchange";

export const WHATSAPP_QUEUE = "event.drivent.whatsapp";
export const EMAIL_QUEUE = "event.drivent.email";
export const SMS_QUEUE = "event.drivent.sms";

export const WHATSAPP_KEY = "whatsapp";
export const EMAIL_KEY = "email";
export const SMS_KEY = "sms";

export const RABBIT_CONFIG: IAmqpConfig = {
  connection: {
    amqpUrl: process.env.AMQP_URL || "amqp://localhost",
    timeout: 2000,
  },
  exchanges: [
    {
      name: EXCHANGE_NAME,
      type: "direct",
      options: { publishTimeout: 1000, persistent: true, durable: false },
    },
  ],
  queues: [
    // {
    //   name: WHATSAPP_QUEUE,
    //   options: { limit: 1000, queueLimit: 1000 },
    // },
    {
      name: EMAIL_QUEUE,
      options: { limit: 1000, queueLimit: 1000 },
    },
    // {
    //   name: SMS_QUEUE,
    //   options: { limit: 1000, queueLimit: 1000 },
    // },
  ],
  binding: [
    // {
    //   exchange: EXCHANGE_NAME,
    //   queue: WHATSAPP_QUEUE,
    //   key: WHATSAPP_KEY,
    // },
    {
      exchange: EXCHANGE_NAME,
      queue: EMAIL_QUEUE,
      key: EMAIL_KEY,
    },
    // {
    //   exchange: EXCHANGE_NAME,
    //   queue: SMS_QUEUE,
    //   key: SMS_KEY,
    // },
  ],
};
