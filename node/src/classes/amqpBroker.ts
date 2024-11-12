import * as amqp from "amqplib";
import { ConsumeMessage, Replies, Options } from "amqplib";
import AssertQueue = Replies.AssertQueue;
import AssertExchange = Options.AssertExchange;
import logger from "../utils/logger/logger.util";
import { IAmqpConfig, IAmqpExchange } from "../interfaces/amqpConfig.interface";

export class AmqpBroker {
  private config: IAmqpConfig;
  private acknowledge: boolean;
  private connection: any;
  private channel: any;
  private finished: boolean;

  constructor(config: IAmqpConfig) {
    this.connection = null;
    this.finished = false;
    this.acknowledge = false;
    this.config = config;
  }

  get getNoAck() {
    return this.acknowledge;
  }

  async init() {
    await this.connect();
    await Promise.all(
      this.config.exchanges.map((exchange: IAmqpExchange) => {
        this.addExchange(exchange.name, exchange.type, exchange.options);
      })
    );
    logger.info("Init exchanges ok");

    for (const queue of this.config.queues) {
      await this.createQueue.bind(this)(queue);
    }
  }

  async connect() {
    if (this.connection !== null) {
      logger.info("[connect] looks like broker is already connected, skip");
      return;
    }
    if (!this.config.connection.amqpUrl) {
      logger.error("rabbitMQ host name is undefined! unable to connect");
      return;
    }
    try {
      this.connection = await amqp.connect(this.config.connection.amqpUrl);
      this.channel = await this.connection.createChannel();
      this.connection.on("error", (err: Error) => {
        this.connection = null;
        if (err.message !== "connection closing") {
          logger.error("[Broker-AMQP] connection error", err.message);
        }
      });
    } catch (error) {
      logger.error(
        `ERROR! [connect] on trying to connection to ${this.config.connection.amqpUrl}`
      );
      this.connection = null;
      if (!this.finished) setTimeout(this.connect.bind(this), 1000);
    }
  }

  async close() {
    await this.channel.close;
    await this.connection.close();
    this.finished = true;
    logger.info("The connection was close");
  }

  private async initQueueCB(queueCreated: { queue: any }) {
    logger.info("InitQueueCB: queue - " + JSON.stringify(queueCreated));
    const neededBinding = this.config.binding.filter(
      (binding: { queue: string }): boolean =>
        binding.queue === queueCreated.queue
    );
    for (const binding of neededBinding) {
      logger.info("InitQueueCB: binding - " + JSON.stringify(binding));
      await this.addBinding(binding.exchange, binding.queue, binding.key);
    }
  }

  private async createQueue(queue: { name: string; options?: object }) {
    const { name, options = {} } = queue;
    const assertQueue = await this.channel.assertQueue(name, options);
    await this.initQueueCB.bind(this)(assertQueue);
  }

  private async addExchange(name: string, type: string, options: object) {
    await this.channel.assertExchange(name, type, options);
  }

  private async addQueue(name: string, options: object): Promise<any> {
    return await this.channel.assertQueue(name, options);
  }

  private async addBinding(exchange: string, queue: string, key: string) {
    await this.channel.bindQueue(queue, exchange, key);
  }

  public send(
    exchange: string,
    key: string,
    msg: object | string,
    noAck = true,
    options?: Options.Publish
  ) {
    const defaultOption: Options.Publish = {
      persistent: false,
      timestamp: Date.now(),
      contentEncoding: "utf-8",
      contentType: "application/json",
      headers: {
        // messageId: uuidv4(),
        source: exchange + ":" + key,
      },
      ...options,
    };
    const msgToSend = typeof msg === "object" ? JSON.stringify(msg) : msg;
    
    logger.info("Message send" + msgToSend);
    this.channel.publish(exchange, key, Buffer.from(msgToSend), defaultOption);
  }

  public async addConsume(
    queue: string,
    callBack: (message: ConsumeMessage) => Promise<void>
  ): Promise<void> {
    await this.channel.consume(queue, callBack, { noAck: !this.getNoAck });
  }
}
