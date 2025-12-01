const { query, transaction } = require('../config/database');
const paypalClient = require('./paypalClient');
const { sendInvoiceNotification } = require('../utils/emailService');
const dateHelpers = require('../utils/dateHelpers');
const config = require('../config/config');
const notificationService = require('./notificationService');

/**
 * Calculate commission for a booking based on partner's commission structure
 * @param {Object} partner - Partner object with commission settings
 * @param {number} revenue - Final net revenue from booking
 * @returns {Object} - { amount, type, rate/flatRate }
 */
function calculateCommission(partner, revenue) {
    const commissionType = partner.commission_type || 'percentage';

    if (commissionType === 'flat_rate' && partner.flat_rate_amount) {
        return {
            amount: parseFloat(partner.flat_rate_amount),
            type: 'flat_rate',
            flatRate: parseFloat(partner.flat_rate_amount)
        };
    }

    // Default to percentage-based
    const rate = partner.commission_rate || config.business.commissionRate;
    return {
        amount: (revenue * rate) / 100,
        type: 'percentage',
        rate: rate
    };
}

/**
 * Create consolidated invoice for a partner's billing cycle
 * @param {number} partnerId - Partner ID
 * @param {string} billingCycle - Billing cycle in YYYY-MM-DD format (1st of month)
 * @returns {Promise<Object>} - Created invoice with line items
 */
async function createConsolidatedInvoice(partnerId, billingCycle) {
    return await transaction(async (client) => {
        // Get partner details
        const partnerResult = await client.query(
            'SELECT * FROM partners WHERE id = $1',
            [partnerId]
        );

        if (partnerResult.rows.length === 0) {
            throw new Error(`Partner ${partnerId} not found`);
        }

        const partner = partnerResult.rows[0];

        // Check if invoice already exists for this billing cycle
        const existingInvoice = await client.query(
            'SELECT id FROM invoices WHERE partner_id = $1 AND billing_cycle = $2',
            [partnerId, billingCycle]
        );

        if (existingInvoice.rows.length > 0) {
            console.log(`Invoice already exists for partner ${partnerId} billing cycle ${billingCycle}`);
            return existingInvoice.rows[0];
        }

        // Get all completed bookings ready for this billing cycle
        // Bookings that: 1) are completed, 2) passed 30 days, 3) not yet invoiced
        const bookingsResult = await client.query(
            `SELECT rb.* 
             FROM retreat_bookings rb
             WHERE rb.partner_id = $1
             AND rb.status = 'completed'
             AND rb.invoiced = FALSE
             AND rb.retreat_date <= CURRENT_DATE - INTERVAL '30 days'
             ORDER BY rb.retreat_date ASC`,
            [partnerId]
        );

        const bookings = bookingsResult.rows;

        if (bookings.length === 0) {
            console.log(`No bookings ready for invoicing for partner ${partnerId}`);
            return null;
        }

        // Calculate total amount and prepare line items
        let totalAmount = 0;
        const lineItems = [];

        for (const booking of bookings) {
            const commission = calculateCommission(partner, booking.final_net_revenue);
            totalAmount += commission.amount;

            lineItems.push({
                booking_id: booking.id,
                guest_name: booking.guest_name,
                retreat_date: booking.retreat_date,
                revenue: booking.final_net_revenue,
                commission_type: commission.type,
                commission_rate: commission.rate || null,
                flat_rate_amount: commission.flatRate || null,
                line_item_amount: commission.amount
            });
        }

        // Calculate due date (72 hours from now)
        // Invoices are only created for retreats 30+ days old
        const dueDate = dateHelpers.calculateInvoiceDueDate();

        // Create invoice
        const invoiceResult = await client.query(
            `INSERT INTO invoices 
             (partner_id, billing_cycle, amount, due_date, status) 
             VALUES ($1, $2, $3, $4, 'pending') 
             RETURNING *`,
            [partnerId, billingCycle, totalAmount, dateHelpers.formatDateForDB(dueDate)]
        );

        const invoice = invoiceResult.rows[0];

        // Insert line items
        for (const lineItem of lineItems) {
            await client.query(
                `INSERT INTO invoice_line_items 
                 (invoice_id, booking_id, guest_name, retreat_date, revenue, 
                  commission_type, commission_rate, flat_rate_amount, line_item_amount)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    invoice.id,
                    lineItem.booking_id,
                    lineItem.guest_name,
                    lineItem.retreat_date,
                    lineItem.revenue,
                    lineItem.commission_type,
                    lineItem.commission_rate,
                    lineItem.flat_rate_amount,
                    lineItem.line_item_amount
                ]
            );

            // Mark booking as invoiced
            await client.query(
                'UPDATE retreat_bookings SET invoiced = TRUE WHERE id = $1',
                [lineItem.booking_id]
            );
        }

        // Create PayPal invoice with line items
        const paypalInvoiceData = paypalClient.buildConsolidatedInvoiceData({
            partner: {
                name: partner.name,
                email: partner.email,
            },
            lineItems,
            totalAmount,
            dueDate: dateHelpers.formatDateForDB(dueDate),
            invoiceNumber: invoice.id,
            billingCycle
        });

        const paypalInvoice = await paypalClient.createInvoice(paypalInvoiceData);
        await paypalClient.sendInvoice(paypalInvoice.id);

        // Update invoice with PayPal ID
        await client.query(
            `UPDATE invoices 
             SET paypal_invoice_id = $1, status = 'sent', sent_date = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [paypalInvoice.id, invoice.id]
        );

        // Send email notification
        const paypalInvoiceUrl = paypalInvoice.href || `https://www.paypal.com/invoice/p/#${paypalInvoice.id}`;
        await sendInvoiceNotification(
            { name: partner.name, email: partner.email },
            { ...invoice, paypal_invoice_id: paypalInvoice.id, line_item_count: lineItems.length },
            paypalInvoiceUrl
        );

        // Create notification
        await notificationService.createNotification({
            type: 'invoice_paid',
            title: 'Invoice Created',
            message: `Consolidated invoice for ${partner.name} created with ${lineItems.length} line items ($${totalAmount.toFixed(2)})`,
            partnerId: partner.id,
            invoiceId: invoice.id
        });

        console.log(`✓ Consolidated invoice created for partner ${partnerId} with ${lineItems.length} line items`);

        return {
            invoice,
            lineItems,
            paypalInvoiceId: paypalInvoice.id
        };
    });
}

/**
 * Process all partners for consolidated invoicing in current billing cycle
 * @returns {Promise<Object>} - Processing results
 */
async function processConsolidatedInvoicing() {
    console.log('Processing consolidated invoicing for current billing cycle...');

    try {
        // Calculate current billing cycle (next month, 1st day)
        const now = new Date();
        const billingCycle = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const billingCycleStr = dateHelpers.formatDateForDB(billingCycle);

        // Get all partners who have completed bookings ready for invoicing
        const partnersResult = await query(
            `SELECT DISTINCT p.id, p.name
             FROM partners p
             JOIN retreat_bookings rb ON p.id = rb.partner_id
             WHERE rb.status = 'completed'
             AND rb.invoiced = FALSE
             AND rb.retreat_date <= CURRENT_DATE - INTERVAL '30 days'
             ORDER BY p.name`
        );

        const partners = partnersResult.rows;
        const results = {
            billingCycle: billingCycleStr,
            totalPartners: partners.length,
            successCount: 0,
            failureCount: 0,
            errors: []
        };

        for (const partner of partners) {
            try {
                const result = await createConsolidatedInvoice(partner.id, billingCycleStr);
                if (result) {
                    results.successCount++;
                }
            } catch (error) {
                console.error(`Failed to create invoice for partner ${partner.id}:`, error);
                results.failureCount++;
                results.errors.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    error: error.message
                });
            }
        }

        console.log(`✓ Consolidated invoicing complete: ${results.successCount} invoices created, ${results.failureCount} failed`);
        return results;
    } catch (error) {
        console.error('Error processing consolidated invoicing:', error);
        throw error;
    }
}

/**
 * Check payment status for pending invoices
 * @returns {Promise<Object>} - Check results
 */
async function checkInvoicePayments() {
    console.log('Checking invoice payment statuses...');

    try {
        const result = await query(
            `SELECT * FROM invoices 
             WHERE status = 'sent' 
             AND paypal_invoice_id IS NOT NULL
             ORDER BY sent_date ASC`
        );

        const invoices = result.rows;
        const results = {
            totalInvoices: invoices.length,
            paidCount: 0,
            stillPending: 0
        };

        for (const invoice of invoices) {
            try {
                const isPaid = await paypalClient.isInvoicePaid(invoice.paypal_invoice_id);

                if (isPaid) {
                    await query(
                        `UPDATE invoices 
                         SET status = 'paid', paid_date = CURRENT_TIMESTAMP 
                         WHERE id = $1`,
                        [invoice.id]
                    );

                    // Create notification
                    await notificationService.createNotification({
                        type: 'invoice_paid',
                        title: 'Invoice Paid',
                        message: `Invoice #${invoice.id} has been paid ($${invoice.amount})`,
                        partnerId: invoice.partner_id,
                        invoiceId: invoice.id
                    });

                    results.paidCount++;
                    console.log(`✓ Invoice ${invoice.id} marked as paid`);
                } else {
                    results.stillPending++;
                }
            } catch (error) {
                console.error(`Error checking payment for invoice ${invoice.id}:`, error);
            }
        }

        console.log(`✓ Payment check complete: ${results.paidCount} paid, ${results.stillPending} still pending`);
        return results;
    } catch (error) {
        console.error('Error checking invoice payments:', error);
        throw error;
    }
}

/**
 * Get invoice statistics
 * @returns {Promise<Object>} - Invoice statistics
 */
async function getInvoiceStats() {
    const result = await query(
        `SELECT 
           COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
           COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
           COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
           SUM(amount) FILTER (WHERE status = 'paid') as total_revenue,
           SUM(amount) FILTER (WHERE status IN ('pending', 'sent')) as outstanding_revenue
         FROM invoices`
    );

    return result.rows[0];
}

module.exports = {
    calculateCommission,
    createConsolidatedInvoice,
    processConsolidatedInvoicing,
    checkInvoicePayments,
    getInvoiceStats
};
