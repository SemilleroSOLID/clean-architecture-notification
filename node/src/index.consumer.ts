import { ConsumerFactory } from "./factory/consumer.factory";
import { IConsumer } from "./interfaces/consumer.interface";
import logger from "./utils/logger/logger.util";

const consumerMode = process.argv[2];
const consumer: IConsumer = ConsumerFactory[consumerMode];

const main = async () => {
  await consumer.suscribe();
  logger.info("Consumer is up, for close the connection press crt + c");
};

main();
