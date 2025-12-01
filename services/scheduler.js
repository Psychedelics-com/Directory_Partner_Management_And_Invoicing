const cron = require('node-cron');
const config = require('../config/config');
const { generateMonthlyReports } = require('./reportGenerator');
const { processConsolidatedInvoicing, checkInvoicePayments } = require('./invoiceService');
const { updateRetreatStatuses } = require('./trackingService');
const { sendVerificationReminder } = require('../utils/emailService');
const { query } = require('../config/database');
const dateHelpers = require('../utils/dateHelpers');
const notificationService = require('./notificationService');

/**
 * Initialize all scheduled tasks
 */
function initializeScheduler() {
    console.log('Initializing automated scheduler...');

    // Run monthly reports on the 10th of each month at 9:00 AM
    cron.schedule('0 9 10 * *', async () => {
        console.log('Running scheduled monthly reports...');
        try {
            await generateMonthlyReports();
        } catch (error) {
            console.error('Error in scheduled monthly reports:', error);
        }
    });

    // Send verification reminders on the 15th of each month at 9:00 AM
    cron.schedule('0 9 15 * *', async () => {
        console.log('Sending verification reminders...');
        try {
            await sendVerificationReminders();
        } catch (error) {
            console.error('Error sending verification reminders:', error);
        }
    });

    // Process consolidated invoicing on the 10th of each month at 10:00 AM
    cron.schedule('0 10 10 * *', async () => {
        console.log('Processing consolidated invoicing...');
        try {
            await processConsolidatedInvoicing();
        } catch (error) {
            console.error('Error processing consolidated invoicing:', error);
        }
    });

    // Check invoice payment statuses daily at 2:00 PM
    cron.schedule('0 14 * * *', async () => {
        console.log('Checking invoice payment statuses...');
        try {
            await checkInvoicePayments();
        } catch (error) {
            console.error('Error checking invoice payments:', error);
        }
    });

    // Update retreat statuses daily at 1:00 AM
    cron.schedule('0 1 * * *', async () => {
        console.log('Updating retreat statuses...');
        try {
            await updateRetreatStatuses();
        } catch (error) {
            console.error('Error updating retreat statuses:', error);
        }
    });

    // Check for overdue items and create notifications daily at 11:00 AM
    cron.schedule('0 11 * * *', async () => {
        console.log('Checking for overdue items and creating notifications...');
        try {
            const verificationCount = await notificationService.checkOverdueVerifications();
            const paymentCount = await notificationService.checkOverduePayments();
            console.log(`✓ Created ${verificationCount} verification notifications and ${paymentCount} payment notifications`);
        } catch (error) {
            console.error('Error checking overdue items:', error);
        }
    });

    console.log('✓ Scheduler initialized with the following tasks:');
    console.log('  - Monthly reports: 10th of each month at 9:00 AM');
    console.log('  - Verification reminders: 15th of each month at 9:00 AM');
    console.log('  - Invoicing: Real-time when verification forms are submitted (30+ day old retreats)');
    console.log('  - Check overdue items: Daily at 11:00 AM');
    console.log('  - Check invoice payments: Daily at 2:00 PM');
    console.log('  - Update retreat statuses: Daily at 1:00 AM');
}

/**
 * Send verification reminders to partners with unsubmitted forms
 */
async function sendVerificationReminders() {
    try {
        const currentMonth = dateHelpers.getCurrentMonth();

        // Find unsubmitted verification forms
        const result = await query(
            `SELECT vf.*, p.name, p.email
       FROM verification_forms vf
       JOIN partners p ON vf.partner_id = p.id
       WHERE vf.status = 'sent'
       AND vf.report_month = $1`,
            [`${currentMonth}-01`]
        );

        const forms = result.rows;
        console.log(`Found ${forms.length} unsubmitted verification forms`);

        for (const form of forms) {
            const verificationUrl = `${config.urls.verificationFormUrl}/${form.unique_token}`;
            const deadline = dateHelpers.formatDateForDisplay(new Date());

            await sendVerificationReminder(
                { name: form.name, email: form.email },
                verificationUrl,
                deadline
            );

            // Update form status to overdue
            await query(
                'UPDATE verification_forms SET status = $1 WHERE id = $2',
                ['overdue', form.id]
            );
        }

        console.log(`✓ Sent ${forms.length} verification reminders`);
    } catch (error) {
        console.error('Error sending verification reminders:', error);
        throw error;
    }
}

/**
 * Manually trigger monthly report generation (for testing)
 * @param {string} month - Month in YYYY-MM format (optional)
 */
async function triggerMonthlyReports(month = null) {
    console.log('Manually triggering monthly reports...');
    return await generateMonthlyReports(month);
}

/**
 * Manually trigger invoice processing (for testing)
 */
async function triggerInvoiceProcessing() {
    console.log('Manually triggering invoice processing...');
    return await processCompletedRetreats();
}

/**
 * Manually trigger payment status check (for testing)
 */
async function triggerPaymentCheck() {
    console.log('Manually triggering payment status check...');
    return await checkInvoicePayments();
}

module.exports = {
    initializeScheduler,
    sendVerificationReminders,
    triggerMonthlyReports,
    triggerInvoiceProcessing,
    triggerPaymentCheck,
};
