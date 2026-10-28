/** Where emails go. SMTP in every environment (Mailpit locally); tests swap in an in-memory sender. */
export const MAIL_SENDER = Symbol('MAIL_SENDER');

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailSender {
  send(mail: OutgoingMail): Promise<void>;
}

/** Keeps every message in memory. Used by the API e2e tests to read verification links. */
export class InMemoryMailSender implements MailSender {
  readonly sent: OutgoingMail[] = [];

  async send(mail: OutgoingMail): Promise<void> {
    this.sent.push(mail);
  }

  lastTo(to: string): OutgoingMail | undefined {
    return this.sent.filter((mail) => mail.to === to).at(-1);
  }
}
