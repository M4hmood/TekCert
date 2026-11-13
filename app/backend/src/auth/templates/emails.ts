import type { OutgoingMail } from '../../mail/interfaces/mail-sender';
import { escapeHtml as escape, mailLayout as layout } from '../../mail/layout';

/** Plain, brand-coloured HTML that renders in every client, plus a text version. */

interface LinkMail {
  firstName: string;
  url: string;
}

export function verifyEmailMail(to: string, { firstName, url }: LinkMail): OutgoingMail {
  const name = escape(firstName);
  return {
    to,
    subject: 'Confirm your TekCert account',
    text: `Hello ${firstName},\n\nConfirm your institute address to activate your TekCert account:\n${url}\n\nThe link is valid for 24 hours. If you did not create an account, ignore this email.`,
    html: layout(
      'Confirm your address',
      [
        `Hello ${name},`,
        'Confirm your institute address to activate your TekCert account. The link is valid for 24 hours.',
      ],
      { label: 'Confirm my address', url },
    ),
  };
}

export function resetPasswordMail(to: string, { firstName, url }: LinkMail): OutgoingMail {
  const name = escape(firstName);
  return {
    to,
    subject: 'Reset your TekCert password',
    text: `Hello ${firstName},\n\nReset your password with this link (valid for 30 minutes):\n${url}\n\nIf you did not ask for this, ignore this email; your password stays the same.`,
    html: layout(
      'Reset your password',
      [
        `Hello ${name},`,
        'Choose a new password with the link below. It is valid for 30 minutes.',
        'If you did not ask for this, ignore this email; your password stays the same.',
      ],
      { label: 'Choose a new password', url },
    ),
  };
}

/** Sent instead of a verification email when someone signs up with an address that already has an account. */
export function accountExistsMail(
  to: string,
  { firstName, signInUrl, resetUrl }: { firstName: string; signInUrl: string; resetUrl: string },
): OutgoingMail {
  const name = escape(firstName);
  return {
    to,
    subject: 'You already have a TekCert account',
    text: `Hello ${firstName},\n\nSomeone tried to create a TekCert account with this address, but you already have one.\nSign in: ${signInUrl}\nForgot your password? ${resetUrl}\n\nIf this was not you, you can ignore this email.`,
    html: layout(
      'You already have an account',
      [
        `Hello ${name},`,
        'Someone tried to create a TekCert account with this address, but you already have one.',
        `Forgot your password? <a href="${resetUrl}" style="color:#1c2f5e">Reset it here</a>. If this was not you, you can ignore this email.`,
      ],
      { label: 'Sign in', url: signInUrl },
    ),
  };
}
