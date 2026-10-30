import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import type { Env } from '../config/env';
import { MAIL_SENDER, type MailSender } from './interfaces/mail-sender';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): MailSender => {
        const transport = createTransport(config.get('SMTP_URL', { infer: true }));
        const from = config.get('MAIL_FROM', { infer: true });
        const logger = new Logger('Mail');
        return {
          async send(mail) {
            await transport.sendMail({ from, ...mail });
            logger.log(`Sent "${mail.subject}"`);
          },
        };
      },
    },
  ],
  exports: [MAIL_SENDER],
})
export class MailModule {}
