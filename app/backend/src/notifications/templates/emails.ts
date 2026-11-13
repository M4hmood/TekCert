import type { NotificationText } from '@tekcert/types';
import type { OutgoingMail } from '../../mail/interfaces/mail-sender';
import { escapeHtml, mailLayout } from '../../mail/layout';

/** One notification as an email: the same words as in the app, and a button to the screen. */
export function notificationMail(
  to: string,
  { firstName, text, webUrl }: { firstName: string; text: NotificationText; webUrl: string },
): OutgoingMail {
  const settingsUrl = `${webUrl}/settings/notifications`;
  const action = text.action && { label: text.action.label, url: `${webUrl}${text.action.href}` };
  return {
    to,
    subject: text.title,
    text: [
      `Hello ${firstName},`,
      `${text.title}\n${text.body}`,
      ...(action ? [`${action.label}: ${action.url}`] : []),
      `Choose which emails you get: ${settingsUrl}`,
    ].join('\n\n'),
    html: mailLayout(
      escapeHtml(text.title),
      [`Hello ${escapeHtml(firstName)},`, escapeHtml(text.body)],
      action ? { label: escapeHtml(action.label), url: action.url } : undefined,
      `You get this email because of your notification settings. <a href="${settingsUrl}" style="color:#1c2f5e">Choose which emails you get</a>.`,
    ),
  };
}
