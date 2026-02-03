/**
 * Email service using nodemailer with Gmail SMTP
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// =============================================================================
// TYPES
// =============================================================================

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class MailError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'MailError';
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

function getMailConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromName = process.env.SMTP_FROM_NAME || 'SaaS Resto';
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;

  return { host, port, secure, user, pass, fromName, fromEmail };
}

// =============================================================================
// TRANSPORTER
// =============================================================================

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const config = getMailConfig();

  if (!config.user || !config.pass) {
    throw new MailError(
      'Email not configured: SMTP_USER and SMTP_PASS are required'
    );
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

// =============================================================================
// SEND MAIL
// =============================================================================

/**
 * Send an email
 * @throws MailError on failure (for internal logging, never expose to client)
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  const config = getMailConfig();
  const isDev = process.env.NODE_ENV === 'development';

  // In development without SMTP credentials, just log
  if (isDev && (!config.user || !config.pass)) {
    console.log('📧 [DEV] Email would be sent:');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body preview: ${options.text?.substring(0, 100) || options.html.substring(0, 100)}...`);
    return;
  }

  try {
    const transport = getTransporter();
    
    await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    });

    if (isDev) {
      console.log(`📧 Email sent to ${options.to}`);
    }
  } catch (error) {
    // Log the error server-side but never expose details to client
    console.error('Failed to send email:', error);
    throw new MailError('Failed to send email', error);
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Generate password reset email
 */
export function generatePasswordResetEmail(resetUrl: string, expiresInMinutes: number): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Réinitialisation de votre mot de passe - SaaS Resto';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; color: #18181b;">Réinitialisation de mot de passe</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #3f3f46;">
                Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 24px; color: #3f3f46;">
                Ce lien est valide pendant <strong>${expiresInMinutes} minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px; text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #18181b; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 6px;">
                Réinitialiser mon mot de passe
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 10px; font-size: 14px; line-height: 20px; color: #71717a;">
                Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; line-height: 18px; color: #a1a1aa; word-break: break-all;">
                ${resetUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #fafafa; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                © ${new Date().getFullYear()} SaaS Resto. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Réinitialisation de votre mot de passe - SaaS Resto

Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe.
Ce lien est valide pendant ${expiresInMinutes} minutes.

${resetUrl}

Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.

© ${new Date().getFullYear()} SaaS Resto
  `.trim();

  return { subject, html, text };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Basic HTML to text conversion
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
