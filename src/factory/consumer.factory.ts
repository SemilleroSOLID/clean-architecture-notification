import { EmailConsumer } from "../consumer/emailConsumer.service";
import { SmsConsumer } from "../consumer/smsConsumer.service";
import { WhatsappConsumer } from "../consumer/whatsappConsumer.service";
import { IConsumer } from "../interfaces/consumer.interface";

export const ConsumerFactory: { [key: string]: IConsumer } = {
  whatsapp: new WhatsappConsumer(),
  sms: new SmsConsumer(),
  email: new EmailConsumer(),
};
