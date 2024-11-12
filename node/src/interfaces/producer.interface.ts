export interface IPublisher {
  connect(): Promise<void>;
  publish(exchangeName: string, key: string, message: object | string): void;
  close(): Promise<void>;
}
