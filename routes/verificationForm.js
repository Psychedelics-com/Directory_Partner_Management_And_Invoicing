const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/database');
const dateHelpers = require('../utils/dateHelpers');
const config = require('../config/config');

/**
 * GET /api/verification/:token
 * Load verification form data
 */
router.get('/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Get verification form
        const formResult = await query(
            `SELECT vf.*, p.name as partner_name, p.email as partner_email
       FROM verification_forms vf
       JOIN partners p ON vf.partner_id = p.id
       WHERE vf.unique_token = $1`,
            [token]
        );

        if (formResult.rows.length === 0) {
            return res.status(404).json({ error: 'Verification form not found' });
        }

        const form = formResult.rows[0];

        // Check if already submitted
        if (form.status === 'submitted') {
            return res.status(400).json({ error: 'This form has already been submitted' });
        }

        // Get all bookings from the past 3 months and next 12 months
        // This includes recent past retreats to verify and all upcoming bookings
        const retreatsResult = await query(
            `SELECT * FROM retreat_bookings
       WHERE partner_id = $1
       AND retreat_date >= CURRENT_DATE - INTERVAL '3 months'
       AND retreat_date <= CURRENT_DATE + INTERVAL '12 months'
       ORDER BY retreat_date ASC`,
            [form.partner_id]
        );

        const deadline = new Date();
        deadline.setDate(config.business.deadlineDay);

        res.json({
            partnerName: form.partner_name,
            deadline: dateHelpers.formatDateForDisplay(deadline),
            retreats: retreatsResult.rows,
        });
    } catch (error) {
        console.error('Error loading verification form:', error);
        res.status(500).json({ error: 'Failed to load verification form' });
    }
});

/**
 * POST /api/verification/:token
 * Submit verification form
 */
router.post('/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const formData = req.body;

        // Get verification form
        const formResult = await query(
            'SELECT * FROM verification_forms WHERE unique_token = $1',
            [token]
        );

        if (formResult.rows.length === 0) {
            return res.status(404).json({ error: 'Verification form not found' });
        }

        const form = formResult.rows[0];

        if (form.status === 'submitted') {
            return res.status(400).json({ error: 'Form already submitted' });
        }

        // Process within transaction
        await transaction(async (client) => {
            // Update each retreat based on verification
            for (const retreat of retreats) {
                const { id, status, final_revenue, rescheduled_date, notes } = retreat;

                if (status === 'completed') {
                    await client.query(
                        `UPDATE retreat_bookings 
                         SET status = 'completed', 
                             final_net_revenue = $1, 
                             verification_date = CURRENT_TIMESTAMP,
                             notes = $2
                         WHERE id = $3`,
                        [final_revenue, notes || null, id]
                    );
                } else if (status === 'canceled') {
                    await client.query(
                        `UPDATE retreat_bookings 
                         SET status = 'canceled', 
                             verification_date = CURRENT_TIMESTAMP,
                             notes = $2
                         WHERE id = $1`,
                        [id, notes || null]
                    );
                } else if (status === 'rescheduled') {
                    await client.query(
                        `UPDATE retreat_bookings 
                         SET status = 'rescheduled', 
                             rescheduled_date = $1,
                             verification_date = CURRENT_TIMESTAMP,
                             notes = $3
                         WHERE id = $2`,
                        [rescheduled_date, id, notes || null]
                    );
                }
            }

            // Mark form as submitted
            await client.query(
                `UPDATE verification_forms 
                 SET status = 'submitted', 
                     submitted_date = CURRENT_TIMESTAMP,
                     form_data = $1
                 WHERE id = $2`,
                [JSON.stringify(retreats), form.id]
            );
        });

        // After successful verification, trigger invoicing for this partner
        // Only invoice retreats that are 30+ days old and newly verified as completed
        try {
            const { createConsolidatedInvoice } = require('../services/invoiceService');
            // dateHelpers is already required at the top of the file

            // Calculate current billing cycle (next month)
            const now = new Date();
            const billingCycle = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const billingCycleStr = dateHelpers.formatDateForDB(billingCycle);

            // Attempt to create invoice for this partner
            const invoiceResult = await createConsolidatedInvoice(form.partner_id, billingCycleStr);

            if (invoiceResult) {
                console.log(`✓ Invoice automatically created for partner ${form.partner_id} after verification form submission`);
            }
        } catch (invoiceError) {
            // Don't fail the verification if invoicing fails
            console.error('Error creating invoice after verification:', invoiceError);
            // Continue - invoice will be picked up by scheduled job if this fails
        }

        res.json({
            success: true,
            message: 'Verification submitted successfully. Invoice will be generated for completed retreats.'
        });
    } catch (error) {
        console.error('Error submitting verification:', error);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
});

/**
 * POST /api/verification/submit-booking/:token
 * Submit a new booking through the verification portal
 */
router.post('/submit-booking/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { guest_name, retreat_date, expected_net_revenue, notes } = req.body;

        // Get verification form to get partner_id
        const formResult = await query(
            'SELECT partner_id FROM verification_forms WHERE unique_token = $1',
            [token]
        );

        if (formResult.rows.length === 0) {
            return res.status(404).json({ error: 'Verification form not found' });
        }

        const partnerId = formResult.rows[0].partner_id;

        // Validate required fields
        if (!guest_name || !retreat_date || !expected_net_revenue) {
            return res.status(400).json({
                error: 'Missing required fields: guest_name, retreat_date, expected_net_revenue'
            });
        }

        // Insert new booking
        const result = await query(
            `INSERT INTO retreat_bookings 
             (partner_id, guest_name, retreat_date, expected_net_revenue, status, notes, created_at)
             VALUES ($1, $2, $3, $4, 'scheduled', $5, CURRENT_TIMESTAMP)
             RETURNING *`,
            [partnerId, guest_name, retreat_date, expected_net_revenue, notes || null]
        );

        const booking = result.rows[0];

        // Create notification for admin
        const notificationService = require('../services/notificationService');
        await notificationService.createNotification({
            type: 'new_booking',
            title: 'New Booking Reported',
            message: `${guest_name} - ${retreat_date} - $${expected_net_revenue}`,
            partnerId: partnerId,
            bookingId: booking.id
        });

        console.log(`✓ New booking reported by partner ${partnerId}: ${guest_name}`);

        res.json({
            success: true,
            message: 'Booking submitted successfully',
            booking: booking
        });
    } catch (error) {
        console.error('Error submitting new booking:', error);
        res.status(500).json({ error: 'Failed to submit booking' });
    }
});

module.exports = router;
