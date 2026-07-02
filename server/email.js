'use strict';
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const FROM       = process.env.EMAIL_FROM || `Spider Hub <${process.env.GMAIL_USER}>`;
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function brandTemplate({ heading, bodyText, ctaHref, ctaLabel, footerNote }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#070a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#070a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111620;border:1px solid #1c2334;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #1c2334;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <!-- Spider icon -->
                <div style="width:52px;height:52px;border-radius:50%;background:#0c1018;border:2px solid #00f5ff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 20px #00f5ff33;margin-bottom:12px;">
                  <span style="font-size:24px;">🕷️</span>
                </div>
              </td></tr>
              <tr><td align="center">
                <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:900;letter-spacing:4px;color:#00f5ff;">SPIDER HUB</div>
                <div style="font-size:10px;letter-spacing:3px;color:#8892a4;margin-top:4px;text-transform:uppercase;">Developed by Ben Maps &bull; Zimbabwe</div>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#e8edf5;font-size:20px;margin:0 0 14px;font-weight:700;">${escapeHtml(heading)}</h2>
            <p style="color:#8892a4;font-size:14px;line-height:1.7;margin:0 0 28px;">${bodyText}</p>

            ${ctaHref ? `
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:24px;">
                <a href="${ctaHref}"
                   style="display:inline-block;padding:14px 36px;background:#00f5ff;color:#070a0f;
                          font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;
                          letter-spacing:.04em;">
                  ${escapeHtml(ctaLabel || 'Continue')}
                </a>
              </td></tr>
            </table>
            <p style="color:#8892a4;font-size:12px;text-align:center;word-break:break-all;">
              If the button doesn't work, copy this link:<br/>
              <a href="${ctaHref}" style="color:#00b8c2;">${ctaHref}</a>
            </p>
            ` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 32px;background:#0c1018;border-top:1px solid #1c2334;">
            <p style="color:#8892a4;font-size:11px;text-align:center;margin:0;">
              ${escapeHtml(footerNote || "If you didn't request this, you can safely ignore this email.")}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendMail({ to, subject, html, text }) {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, text });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return false;
  }
}

function sendVerificationEmail(to, name, token) {
  const link = `${PUBLIC_URL}/verify.html?token=${token}`;
  return sendMail({
    to,
    subject: 'Verify your Spider Hub account',
    text: `Hi ${name}, verify your Spider Hub account: ${link} (expires in 24 hours).`,
    html: brandTemplate({
      heading: `Welcome, ${name}! Verify your email`,
      bodyText: `Thanks for signing up to Spider Hub. Click the button below to activate your account and start browsing movies and music.`,
      ctaHref: link,
      ctaLabel: 'Verify My Email',
      footerNote: "If you didn't sign up for Spider Hub, you can safely ignore this email."
    })
  });
}

function sendResetEmail(to, name, token) {
  const link = `${PUBLIC_URL}/reset.html?token=${token}`;
  return sendMail({
    to,
    subject: 'Reset your Spider Hub password',
    text: `Hi ${name}, reset your Spider Hub password: ${link} (expires in 1 hour).`,
    html: brandTemplate({
      heading: 'Reset your password',
      bodyText: `Hi ${escapeHtml(name)}, we received a request to reset your Spider Hub password. Click below to set a new one. This link expires in 1 hour.`,
      ctaHref: link,
      ctaLabel: 'Reset Password',
      footerNote: "If you didn't request a password reset, you can safely ignore this email."
    })
  });
}

module.exports = { sendVerificationEmail, sendResetEmail };
