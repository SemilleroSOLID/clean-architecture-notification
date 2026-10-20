import nodemailer, { Transporter } from "nodemailer";
import { MAIL_CONFIG } from "../constants/mail.constant";
import { IEmail } from "./emailTemplates";

export interface IMailer {
  send(email: IEmail): Promise<void>;
}

/** Sends the emails by SMTP with nodemailer; in development the server is Mailpit. */
export class SmtpMailer implements IMailer {
  private transporter: Transporter;

  constructor(private config = MAIL_CONFIG) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async send(email: IEmail): Promise<void> {
    await this.transporter.sendMail({ from: this.config.from, ...email });
  }
}
