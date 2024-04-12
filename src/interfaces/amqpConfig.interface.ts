export interface IAmqpConfig {
  connection: IAmqpConnection;
  exchanges: IAmqpExchange[];
  queues: IAmqpQueue[];
  binding: IAmqpBinding[];
}

export interface IAmqpConnection {
  amqpUrl: string;
  timeout: number;
}

export interface IAmqpExchange {
  name: string;
  type: string;
  options: object;
}

export interface IAmqpQueue {
  name: string;
  options: object;
}

export interface IAmqpBinding {
  queue: string;
  exchange: string;
  key: string;
}
