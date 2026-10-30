import type { OutgoingMail } from '../../mail/interfaces/mail-sender';

/** Plain, brand-coloured HTML that renders in every client, plus a text version. */

interface LinkMail {
  firstName: string;
  url: string;
}

function layout(title: string, paragraphs: string[], action?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${action.url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#1c2f5e;color:#ffffff;font-weight:600;text-decoration:none">${action.label}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#62677a">If the button does not work, copy this link:<br><a href="${action.url}" style="color:#1c2f5e;word-break:break-all">${action.url}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f3ec;font-family:Arial,sans-serif;color:#131a2c">
  <div style="max-width:520px;margin:0 auto;padding:32px;background:#fffdf8;border:1px solid #e1dacb;border-radius:14px">
    <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;font-weight:600">TekCert</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:500">${title}</h1>
    ${body}${button}
    <p style="margin:24px 0 0;font-size:13px;color:#62677a">TekCert · TEK-UP community platform</p>
  </div></body></html>`;
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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
