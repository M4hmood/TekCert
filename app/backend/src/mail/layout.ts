/** Plain, brand-coloured HTML that renders in every client. Shared by every email TekCert sends. */

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * `paragraphs` and `footer` are HTML: escape anything a student typed before passing it in.
 * `footer` is a small line under the body, e.g. how to stop receiving these emails.
 */
export function mailLayout(
  title: string,
  paragraphs: string[],
  action?: { label: string; url: string },
  footer?: string,
): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${action.url}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#1c2f5e;color:#ffffff;font-weight:600;text-decoration:none">${action.label}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#62677a">If the button does not work, copy this link:<br><a href="${action.url}" style="color:#1c2f5e;word-break:break-all">${action.url}</a></p>`
    : '';
  const note = footer
    ? `<p style="margin:16px 0 0;font-size:13px;color:#62677a">${footer}</p>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f3ec;font-family:Arial,sans-serif;color:#131a2c">
  <div style="max-width:520px;margin:0 auto;padding:32px;background:#fffdf8;border:1px solid #e1dacb;border-radius:14px">
    <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:22px;font-weight:600">TekCert</p>
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:500">${title}</h1>
    ${body}${button}${note}
    <p style="margin:24px 0 0;font-size:13px;color:#62677a">TekCert · TEK-UP community platform</p>
  </div></body></html>`;
}
