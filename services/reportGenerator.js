const ejs = require('ejs');
const path = require('path');
const { query } = require('../config/database');
const { sendMonthlyReport } = require('../utils/emailService');
const dateHelpers = require('../utils/dateHelpers');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

/**
 * Generate and send monthly reports to all partners
 * @param {string} reportMonth - Month to report on (YYYY-MM format)
 * @returns {Promise<Object>} - Report generation results
 */
async function generateMonthlyReports(reportMonth = null) {
    const month = reportMonth || dateHelpers.getPreviousMonth();
    console.log(`Generating monthly reports for ${month}...`);

    try {
        // Get all active partners
        const partnersResult = await query('SELECT * FROM partners ORDER BY name');
        const partners = partnersResult.rows;

        const results = {
            month,
            totalPartners: partners.length,
            successCount: 0,
            failureCount: 0,
            errors: [],
        };

        // Generate report for each partner
        for (const partner of partners) {
            try {
                await generatePartnerReport(partner, month);
                results.successCount++;
            } catch (error) {
                console.error(`Failed to generate report for partner ${partner.name}:`, error);
                results.failureCount++;
                results.errors.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    error: error.message,
                });
            }
        }

        console.log(`✓ Report generation complete: ${results.successCount} sent, ${results.failureCount} failed`);
        return results;
    } catch (error) {
        console.error('Error generating monthly reports:', error);
        throw error;
    }
}

/**
 * Generate and send report for a single partner
 * @param {Object} partner - Partner object
 * @param {string} reportMonth - Month to report on (YYYY-MM format)
 * @returns {Promise<void>}
 */
async function generatePartnerReport(partner, reportMonth) {
    console.log(`Generating report for ${partner.name}...`);

    // Get traffic data for the month
    const trafficData = await getTrafficData(partner.id, reportMonth);

    // Get scheduled retreats (future dates)
    const scheduledRetreats = await getScheduledRetreats(partner.id);

    // Get retreats needing verification (past dates, not yet verified)
    const retreatsNeedingVerification = await getRetreatsNeedingVerification(partner.id);

    // Create or get verification form token
    let verificationToken = null;
    if (retreatsNeedingVerification.length > 0) {
        verificationToken = await createVerificationForm(partner.id, reportMonth, retreatsNeedingVerification);
    }

    // Generate HTML email
    const htmlContent = await generateReportHTML({
        partner,
        reportMonth,
        trafficData,
        scheduledRetreats,
        retreatsNeedingVerification,
        verificationToken,
    });

    // Send email
    await sendMonthlyReport(partner, htmlContent, reportMonth);

    console.log(`✓ Report sent to ${partner.name}`);
}

/**
 * Get traffic data for a partner and month
 * @param {number} partnerId - Partner ID
 * @param {string} reportMonth - Month (YYYY-MM)
 * @returns {Promise<Object>} - Traffic data
 */
async function getTrafficData(partnerId, reportMonth) {
    const result = await query(
        `SELECT traffic_delivered, warm_leads_sent 
     FROM monthly_traffic_reports 
     WHERE partner_id = $1 AND report_month = $2`,
        [partnerId, `${reportMonth}-01`]
    );

    if (result.rows.length > 0) {
        return result.rows[0];
    }

    // Return default values if no data exists
    return {
        traffic_delivered: 0,
        warm_leads_sent: 0,
    };
}

/**
 * Get scheduled retreats (future dates)
 * @param {number} partnerId - Partner ID
 * @returns {Promise<Array>} - Array of retreat bookings
 */
async function getScheduledRetreats(partnerId) {
    const result = await query(
        `SELECT * FROM retreat_bookings 
     WHERE partner_id = $1 
     AND status = 'scheduled' 
     AND retreat_date > CURRENT_DATE 
     ORDER BY retreat_date ASC`,
        [partnerId]
    );

    return result.rows;
}

/**
 * Get retreats needing verification (past dates, not verified)
 * @param {number} partnerId - Partner ID
 * @returns {Promise<Array>} - Array of retreat bookings
 */
async function getRetreatsNeedingVerification(partnerId) {
    const result = await query(
        `SELECT * FROM retreat_bookings 
     WHERE partner_id = $1 
     AND status = 'scheduled' 
     AND retreat_date <= CURRENT_DATE 
     ORDER BY retreat_date ASC`,
        [partnerId]
    );

    return result.rows;
}

/**
 * Create verification form record and return token
 * @param {number} partnerId - Partner ID
 * @param {string} reportMonth - Month (YYYY-MM)
 * @param {Array} retreats - Retreats needing verification
 * @returns {Promise<string>} - Unique verification token
 */
async function createVerificationForm(partnerId, reportMonth, retreats) {
    const token = uuidv4();
    const deadline = new Date();
    deadline.setDate(config.business.deadlineDay);

    // Check if form already exists for this partner and month
    const existingForm = await query(
        `SELECT unique_token FROM verification_forms 
     WHERE partner_id = $1 AND report_month = $2`,
        [partnerId, `${reportMonth}-01`]
    );

    if (existingForm.rows.length > 0) {
        return existingForm.rows[0].unique_token;
    }

    // Create new form
    const result = await query(
        `INSERT INTO verification_forms 
     (partner_id, report_month, unique_token, status, form_data) 
     VALUES ($1, $2, $3, 'sent', $4) 
     RETURNING unique_token`,
        [partnerId, `${reportMonth}-01`, token, JSON.stringify({ retreats: retreats.map(r => r.id) })]
    );

    return result.rows[0].unique_token;
}

/**
 * Generate HTML content for the report email
 * @param {Object} data - Report data
 * @returns {Promise<string>} - HTML content
 */
async function generateReportHTML(data) {
    const templatePath = path.join(__dirname, '../templates/emailTemplates/monthlyReport.html');

    const deadline = new Date();
    deadline.setDate(config.business.deadlineDay);

    const verificationUrl = data.verificationToken
        ? `${config.urls.verificationFormUrl}/${data.verificationToken}`
        : null;

    const templateData = {
        partnerName: data.partner.name,
        reportMonth: formatMonthForDisplay(data.reportMonth),
        trafficDelivered: data.trafficData.traffic_delivered || 0,
        warmLeadsSent: data.trafficData.warm_leads_sent || 0,
        scheduledRetreats: data.scheduledRetreats || [],
        retreatsNeedingVerification: data.retreatsNeedingVerification || [],
        verificationUrl,
        deadline: dateHelpers.formatDateForDisplay(deadline),
        supportEmail: config.email.fromEmail,
        formatDate: dateHelpers.formatDateForDisplay,
    };

    const html = await ejs.renderFile(templatePath, templateData);
    return html;
}

/**
 * Format month string for display
 * @param {string} monthString - Month in YYYY-MM format
 * @returns {string} - Formatted month (e.g., "January 2024")
 */
function formatMonthForDisplay(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

module.exports = {
    generateMonthlyReports,
    generatePartnerReport,
    getTrafficData,
    getScheduledRetreats,
    getRetreatsNeedingVerification,
};
