const { google } = require('googleapis');
const config = require('../config/config');

// Initialize Gmail API client
const oauth2Client = new google.auth.OAuth2(
  config.email.clientId,
  config.email.clientSecret,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: config.email.refreshToken,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Send email using Gmail API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const message = createMessage(to, subject, html, text);

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: message,
      },
    });

    console.log(`✓ Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error('Gmail API error response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Create RFC 2822 formatted email message
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content
 * @returns {string} - Base64 encoded message
 */
function createMessage(to, subject, html, text) {
  const messageParts = [
    `From: ${config.email.fromName} <${config.email.fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html || text || '',
  ];

  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
}

/**
 * Send monthly report email to partner
 * @param {Object} partner - Partner object
 * @param {string} htmlContent - HTML email content
 * @param {string} reportMonth - Report month (YYYY-MM)
 * @returns {Promise<void>}
 */
async function sendMonthlyReport(partner, htmlContent, reportMonth) {
  const subject = `Monthly Partner Report - ${formatMonthForSubject(reportMonth)}`;

  await sendEmail({
    to: partner.email,
    subject,
    html: htmlContent,
  });
}

/**
 * Send verification reminder email
 * @param {Object} partner - Partner object
 * @param {string} verificationUrl - URL to verification form
 * @param {string} deadline - Deadline date
 * @returns {Promise<void>}
 */
async function sendVerificationReminder(partner, verificationUrl, deadline) {
  const subject = 'Reminder: Partner Verification Form Due';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verification Form Reminder</h2>
      <p>Hello ${partner.name},</p>
      <p>This is a friendly reminder that your monthly verification form is due by <strong>${deadline}</strong>.</p>
      <p>Please complete the form at your earliest convenience:</p>
      <p style="margin: 20px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Complete Verification Form
        </a>
      </p>
      <p>If you have any questions, please don't hesitate to reach out.</p>
      <p>Best regards,<br>Psychedelics.com Partner Team</p>
    </div>
  `;

  await sendEmail({
    to: partner.email,
    subject,
    html,
  });
}

/**
 * Send invoice notification email
 * @param {Object} partner - Partner object
 * @param {Object} invoice - Invoice object
 * @param {string} paypalInvoiceUrl - PayPal invoice URL
 * @returns {Promise<void>}
 */
async function sendInvoiceNotification(partner, invoice, paypalInvoiceUrl) {
  const subject = `Invoice #${invoice.id} - Commission Payment Due`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Commission Invoice</h2>
      <p>Hello ${partner.name},</p>
      <p>An invoice has been generated for your completed retreat booking.</p>
      <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p><strong>Invoice Number:</strong> #${invoice.id}</p>
        <p><strong>Amount Due:</strong> $${invoice.amount.toFixed(2)}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
      </div>
      <p>You can view and pay your invoice via PayPal:</p>
      <p style="margin: 20px 0;">
        <a href="${paypalInvoiceUrl}" 
           style="background-color: #0070ba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          View Invoice on PayPal
        </a>
      </p>
      <p>Thank you for your partnership!</p>
      <p>Best regards,<br>Psychedelics.com Partner Team</p>
    </div>
  `;

  await sendEmail({
    to: partner.email,
    subject,
    html,
  });
}

/**
 * Send admin notification email
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @returns {Promise<void>}
 */
async function sendAdminNotification(subject, message) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>System Notification</h2>
      <p>${message}</p>
      <p><em>This is an automated notification from the Partner Automation System.</em></p>
    </div>
  `;

  await sendEmail({
    to: config.email.fromEmail, // Send to admin email
    subject: `[System] ${subject}`,
    html,
  });
}

/**
 * Format month string for email subject
 * @param {string} monthString - Month in YYYY-MM format
 * @returns {string} - Formatted month (e.g., "January 2024")
 */
function formatMonthForSubject(monthString) {
  const [year, month] = monthString.split('-');
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

module.exports = {
  sendEmail,
  sendMonthlyReport,
  sendVerificationReminder,
  sendInvoiceNotification,
  sendAdminNotification,
};
