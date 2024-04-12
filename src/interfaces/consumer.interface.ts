export interface IConsumer {
  suscribe(): Promise<void>;
  close(): Promise<void>;
  //   consumeMessage(message: ConsumeMessage): Promise<void>;
}
