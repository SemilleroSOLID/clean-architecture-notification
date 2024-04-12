import {
  EMAIL_KEY,
  EXCHANGE_NAME,
  SMS_KEY,
  WHATSAPP_KEY,
} from "./constants/rabbit.constant";
import { IPublisher } from "./interfaces/producer.interface";
import { NotificationPublisher } from "./publisher/publisher.service";

const publisher: IPublisher = new NotificationPublisher();
const keys = [EMAIL_KEY, SMS_KEY, WHATSAPP_KEY];

const main = async () => {
  await publisher.connect();
  keys.forEach((key, index) =>
    publisher.publish(
      EXCHANGE_NAME,
      key,
      `Soy la notificacion del publisher ${index} ${key}`
    )
  );
  setTimeout(async () => {
    await publisher.close();
  }, 5000);
};

main();
