const { query } = require('../config/database');
const ejs = require('ejs');

/**
 * Get all email templates
 * @returns {Promise<Array>} - Array of email templates
 */
async function getAllTemplates() {
    const result = await query(
        'SELECT * FROM email_templates ORDER BY name'
    );
    return result.rows;
}

/**
 * Get template by key
 * @param {string} templateKey - Template key
 * @returns {Promise<Object>} - Email template
 */
async function getTemplateByKey(templateKey) {
    const result = await query(
        'SELECT * FROM email_templates WHERE template_key = $1',
        [templateKey]
    );
    return result.rows[0];
}

/**
 * Update email template
 * @param {string} templateKey - Template key
 * @param {Object} updates - Template updates
 * @returns {Promise<Object>} - Updated template
 */
async function updateTemplate(templateKey, updates) {
    const { name, subject, body_html, variables, is_active, send_timing_days } = updates;

    const result = await query(
        `UPDATE email_templates 
     SET name = COALESCE($1, name),
         subject = COALESCE($2, subject),
         body_html = COALESCE($3, body_html),
         variables = COALESCE($4, variables),
         is_active = COALESCE($5, is_active),
         send_timing_days = COALESCE($6, send_timing_days)
     WHERE template_key = $7
     RETURNING *`,
        [name, subject, body_html, variables, is_active, send_timing_days, templateKey]
    );

    return result.rows[0];
}

/**
 * Render email template with data
 * @param {string} templateKey - Template key
 * @param {Object} data - Template data
 * @returns {Promise<Object>} - Rendered email {subject, html}
 */
async function renderTemplate(templateKey, data) {
    const template = await getTemplateByKey(templateKey);

    if (!template) {
        throw new Error(`Template ${templateKey} not found`);
    }

    if (!template.is_active) {
        throw new Error(`Template ${templateKey} is not active`);
    }

    // Render subject
    const subject = ejs.render(template.subject, data);

    // Render HTML body
    const html = ejs.render(template.body_html, data);

    return { subject, html };
}

/**
 * Log email activity
 * @param {Object} emailLog - Email log data
 * @returns {Promise<void>}
 */
async function logEmailActivity({ partnerId, templateKey, subject, sentTo, status = 'sent' }) {
    await query(
        `INSERT INTO email_activity_log 
     (partner_id, template_key, subject, sent_to, status)
     VALUES ($1, $2, $3, $4, $5)`,
        [partnerId, templateKey, subject, sentTo, status]
    );
}

/**
 * Get email activity for partner
 * @param {number} partnerId - Partner ID
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} - Array of email activity
 */
async function getPartnerEmailActivity(partnerId, limit = 50) {
    const result = await query(
        `SELECT * FROM email_activity_log 
     WHERE partner_id = $1 
     ORDER BY sent_at DESC 
     LIMIT $2`,
        [partnerId, limit]
    );

    return result.rows;
}

/**
 * Get all email activity
 * @param {number} limit - Maximum number of records
 * @returns {Promise<Array>} - Array of email activity
 */
async function getAllEmailActivity(limit = 100) {
    const result = await query(
        `SELECT eal.*, p.name as partner_name
     FROM email_activity_log eal
     LEFT JOIN partners p ON eal.partner_id = p.id
     ORDER BY eal.sent_at DESC
     LIMIT $1`,
        [limit]
    );

    return result.rows;
}

module.exports = {
    getAllTemplates,
    getTemplateByKey,
    updateTemplate,
    renderTemplate,
    logEmailActivity,
    getPartnerEmailActivity,
    getAllEmailActivity,
};
