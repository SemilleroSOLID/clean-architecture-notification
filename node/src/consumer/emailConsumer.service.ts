import { ConsumeMessage } from "amqplib";
import { AmqpBroker } from "../classes";
import { MAIL_CONFIG } from "../constants/mail.constant";
import { EMAIL_FAILED_KEY, EMAIL_QUEUE, EXCHANGE_NAME, RABBIT_CONFIG } from "../constants/rabbit.constant";
import logger from "../utils/logger/logger.util";
import { withRetries } from "../utils/retry.util";
import { buildRequestEmail } from "../notification/emailTemplates";
import { IMailer, SmtpMailer } from "../notification/mailer";
import { InvalidEventError, parseRequestEvent } from "../notification/requestEvent";
import { Consumer } from "./consumer.service";
import { IConsumer } from "../interfaces/consumer.interface";

interface IEmailConsumerOptions {
  appUrl: string;
  maxAttempts: number;
  retryDelayMs: number;
}

// Sends the student an email for each state change of a request (SemilleroSOLID/clean-architecture-api#21).
export class EmailConsumer extends Consumer implements IConsumer {
  constructor(
    private mailer: IMailer = new SmtpMailer(),
    private options: IEmailConsumerOptions = MAIL_CONFIG,
    amqp: AmqpBroker = new AmqpBroker(RABBIT_CONFIG)
  ) {
    super(amqp);
  }

  async suscribe(): Promise<void> {
    return super.suscribe(EMAIL_QUEUE);
  }

  async consumeMessage(message: ConsumeMessage): Promise<void> {
    const content = message.content.toString();
    let email;
    try {
      email = buildRequestEmail(parseRequestEvent(content), this.options.appUrl);
    } catch (error) {
      // Retrying a malformed message would fail the same way: it is set aside and the consumer goes on.
      const reason = error instanceof InvalidEventError ? error.message : String(error);
      logger.error(`Mensaje descartado (${reason}): ${content}`);
      return this.setAside(content, `mensaje inválido: ${reason}`);
    }

    try {
      await withRetries(() => this.mailer.send(email), this.options.maxAttempts, this.options.retryDelayMs, (attempt, error) =>
        logger.error(`Intento ${attempt} de ${this.options.maxAttempts} fallido al enviar el correo a ${email.to}: ${(error as Error).message}`)
      );
      logger.info(`Correo enviado a ${email.to}: ${email.subject}`);
    } catch (error) {
      this.setAside(content, `no se pudo enviar el correo: ${(error as Error).message}`);
    }
  }

  // Kept in the failed queue, with the reason, to review it or publish it again by hand.
  private setAside(content: string, reason: string): void {
    this.amqp.send(EXCHANGE_NAME, EMAIL_FAILED_KEY, content, true, {
      persistent: true,
      headers: { reason },
    });
    logger.error(`Mensaje enviado a la cola de fallidos (${reason})`);
  }
}
