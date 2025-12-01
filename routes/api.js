const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const trackingService = require('../services/trackingService');
const invoiceService = require('../services/invoiceService');
const reportGenerator = require('../services/reportGenerator');
const scheduler = require('../services/scheduler');

/**
 * POST /api/bookings
 * Partners report new retreat bookings
 */
router.post('/bookings', async (req, res) => {
    try {
        const { partner_id, guest_name, retreat_date, expected_net_revenue } = req.body;

        // Validate required fields
        if (!partner_id || !guest_name || !retreat_date || !expected_net_revenue) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Insert booking
        const result = await query(
            `INSERT INTO retreat_bookings 
       (partner_id, guest_name, retreat_date, expected_net_revenue, status)
       VALUES ($1, $2, $3, $4, 'scheduled')
       RETURNING *`,
            [partner_id, guest_name, retreat_date, expected_net_revenue]
        );

        res.json({ success: true, booking: result.rows[0] });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

/**
 * GET /api/reports/:partnerId/:month
 * Retrieve specific partner report
 */
router.get('/reports/:partnerId/:month', async (req, res) => {
    try {
        const { partnerId, month } = req.params;

        // Get partner
        const partnerResult = await query('SELECT * FROM partners WHERE id = $1', [partnerId]);
        if (partnerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        const partner = partnerResult.rows[0];

        // Get traffic data
        const trafficData = await reportGenerator.getTrafficData(partnerId, month);

        // Get scheduled retreats
        const scheduledRetreats = await reportGenerator.getScheduledRetreats(partnerId);

        // Get retreats needing verification
        const retreatsNeedingVerification = await reportGenerator.getRetreatsNeedingVerification(partnerId);

        res.json({
            partner,
            month,
            trafficData,
            scheduledRetreats,
            retreatsNeedingVerification,
        });
    } catch (error) {
        console.error('Error retrieving report:', error);
        res.status(500).json({ error: 'Failed to retrieve report' });
    }
});

/**
 * POST /api/invoices/webhook
 * PayPal payment webhook
 */
router.post('/invoices/webhook', async (req, res) => {
    try {
        const event = req.body;

        // Handle PayPal webhook events
        if (event.event_type === 'INVOICING.INVOICE.PAID') {
            const invoiceId = event.resource.id;

            // Update invoice status
            await query(
                `UPDATE invoices 
         SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
         WHERE paypal_invoice_id = $1`,
                [invoiceId]
            );

            console.log(`✓ Invoice ${invoiceId} marked as paid via webhook`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', async (req, res) => {
    try {
        const trackingStats = await trackingService.getTrackingStats();
        const invoiceStats = await invoiceService.getInvoiceStats();
        const partnerMetrics = await trackingService.getPartnerMetrics();

        res.json({
            tracking: trackingStats,
            invoices: invoiceStats,
            partners: partnerMetrics,
        });
    } catch (error) {
        console.error('Error retrieving dashboard stats:', error);
        res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
    }
});

/**
 * GET /api/retreats/upcoming
 * Get upcoming retreats
 */
router.get('/retreats/upcoming', async (req, res) => {
    try {
        const daysAhead = parseInt(req.query.days) || 30;
        const retreats = await trackingService.getUpcomingRetreats(daysAhead);
        res.json({ retreats });
    } catch (error) {
        console.error('Error retrieving upcoming retreats:', error);
        res.status(500).json({ error: 'Failed to retrieve upcoming retreats' });
    }
});

/**
 * GET /api/retreats/verification-needed
 * Get retreats needing verification
 */
router.get('/retreats/verification-needed', async (req, res) => {
    try {
        const retreats = await trackingService.getRetreatsNeedingVerification();
        res.json({ retreats });
    } catch (error) {
        console.error('Error retrieving retreats:', error);
        res.status(500).json({ error: 'Failed to retrieve retreats' });
    }
});

/**
 * POST /api/admin/trigger-reports
 * Manually trigger monthly reports (admin only)
 */
router.post('/admin/trigger-reports', async (req, res) => {
    try {
        const { month } = req.body;
        const results = await scheduler.triggerMonthlyReports(month);
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error triggering reports:', error);
        res.status(500).json({ error: 'Failed to trigger reports' });
    }
});

/**
 * POST /api/admin/trigger-invoicing
 * Manually trigger invoice processing (admin only)
 */
router.post('/admin/trigger-invoicing', async (req, res) => {
    try {
        const results = await scheduler.triggerInvoiceProcessing();
        res.json({ success: true, results });
    } catch (error) {
        console.error('Error triggering invoicing:', error);
        res.status(500).json({ error: 'Failed to trigger invoicing' });
    }
});

module.exports = router;
