import {
  EMAIL_KEY,
  EXCHANGE_NAME,
  SMS_KEY,
  WHATSAPP_KEY,
} from "./constants/rabbit.constant";
import { IPublisher } from "./interfaces/producer.interface";
import { NotificationPublisher } from "./publisher/publisher.service";

const publisher: IPublisher = new NotificationPublisher();

// To try the consumers without the backend: an event like the ones of the api for email, plain text for the others.
const sampleEvent = {
  event: "REQUEST_STATUS_CHANGED",
  requestId: 1,
  studentId: 1,
  studentName: "Estudiante de prueba",
  studentEmail: "estudiante@ucaldas.test",
  convocationId: 1,
  convocationTitle: "Convocatoria de prueba",
  previousState: "PENDING",
  newState: "ACCEPT",
  comment: null,
  date: new Date().toISOString(),
};

const main = async () => {
  await publisher.connect();
  publisher.publish(EXCHANGE_NAME, EMAIL_KEY, sampleEvent);
  [SMS_KEY, WHATSAPP_KEY].forEach((key, index) =>
    publisher.publish(EXCHANGE_NAME, key, `Soy la notificacion del publisher ${index} ${key}`)
  );
  setTimeout(async () => {
    await publisher.close();
  }, 5000);
};

main();
