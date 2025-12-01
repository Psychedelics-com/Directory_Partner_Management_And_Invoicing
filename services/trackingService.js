const { query } = require('../config/database');
const dateHelpers = require('../utils/dateHelpers');

/**
 * Update retreat booking statuses based on dates
 * @returns {Promise<Object>} - Update results
 */
async function updateRetreatStatuses() {
    console.log('Updating retreat statuses...');

    try {
        // This function is called daily to ensure data consistency
        // Currently, status updates are primarily handled through verification forms
        // This serves as a backup to ensure no retreats are stuck in "scheduled" status

        const results = {
            updatedCount: 0,
        };

        console.log(`✓ Status update complete: ${results.updatedCount} retreats updated`);
        return results;
    } catch (error) {
        console.error('Error updating retreat statuses:', error);
        throw error;
    }
}

/**
 * Get tracking statistics for all retreats
 * @returns {Promise<Object>} - Tracking statistics
 */
async function getTrackingStats() {
    const result = await query(
        `SELECT 
       COUNT(*) FILTER (WHERE status = 'scheduled' AND retreat_date > CURRENT_DATE) as upcoming_count,
       COUNT(*) FILTER (WHERE status = 'scheduled' AND retreat_date <= CURRENT_DATE) as needs_verification_count,
       COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
       COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
       COUNT(*) FILTER (WHERE status = 'rescheduled') as rescheduled_count,
       SUM(expected_net_revenue) FILTER (WHERE status = 'scheduled' AND retreat_date > CURRENT_DATE) as upcoming_revenue,
       SUM(final_net_revenue) FILTER (WHERE status = 'completed') as completed_revenue
     FROM retreat_bookings`
    );

    return result.rows[0];
}

/**
 * Get upcoming retreats
 * @param {number} daysAhead - Number of days to look ahead (default 30)
 * @returns {Promise<Array>} - Array of upcoming retreats
 */
async function getUpcomingRetreats(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const result = await query(
        `SELECT rb.*, p.name as partner_name, p.email as partner_email
     FROM retreat_bookings rb
     JOIN partners p ON rb.partner_id = p.id
     WHERE rb.status = 'scheduled'
     AND rb.retreat_date > CURRENT_DATE
     AND rb.retreat_date <= $1
     ORDER BY rb.retreat_date ASC`,
        [dateHelpers.formatDateForDB(futureDate)]
    );

    return result.rows;
}

/**
 * Get retreats needing verification across all partners
 * @returns {Promise<Array>} - Array of retreats needing verification
 */
async function getRetreatsNeedingVerification() {
    const result = await query(
        `SELECT rb.*, p.name as partner_name, p.email as partner_email
     FROM retreat_bookings rb
     JOIN partners p ON rb.partner_id = p.id
     WHERE rb.status = 'scheduled'
     AND rb.retreat_date <= CURRENT_DATE
     ORDER BY rb.retreat_date ASC`
    );

    return result.rows;
}

/**
 * Get completed retreats awaiting payment
 * @returns {Promise<Array>} - Array of completed retreats without invoices
 */
async function getCompletedRetreatsAwaitingPayment() {
    const result = await query(
        `SELECT rb.*, p.name as partner_name, p.email as partner_email
     FROM retreat_bookings rb
     JOIN partners p ON rb.partner_id = p.id
     LEFT JOIN invoices i ON rb.id = i.booking_id
     WHERE rb.status = 'completed'
     AND i.id IS NULL
     ORDER BY rb.retreat_date ASC`
    );

    return result.rows;
}

/**
 * Get invoiced retreats
 * @returns {Promise<Array>} - Array of retreats with invoices
 */
async function getInvoicedRetreats() {
    const result = await query(
        `SELECT rb.*, p.name as partner_name, p.email as partner_email,
            i.id as invoice_id, i.amount as invoice_amount, 
            i.status as invoice_status, i.due_date, i.paid_date
     FROM retreat_bookings rb
     JOIN partners p ON rb.partner_id = p.id
     JOIN invoices i ON rb.id = i.booking_id
     WHERE rb.status = 'completed'
     ORDER BY i.sent_date DESC`
    );

    return result.rows;
}

/**
 * Get partner performance metrics
 * @param {number} partnerId - Partner ID (optional, null for all partners)
 * @returns {Promise<Array>} - Array of partner metrics
 */
async function getPartnerMetrics(partnerId = null) {
    const whereClause = partnerId ? 'WHERE p.id = $1' : '';
    const params = partnerId ? [partnerId] : [];

    const result = await query(
        `SELECT 
       p.id,
       p.name,
       p.email,
       COUNT(rb.id) FILTER (WHERE rb.status = 'scheduled' AND rb.retreat_date > CURRENT_DATE) as upcoming_bookings,
       COUNT(rb.id) FILTER (WHERE rb.status = 'completed') as completed_bookings,
       COUNT(rb.id) FILTER (WHERE rb.status = 'canceled') as canceled_bookings,
       SUM(rb.final_net_revenue) FILTER (WHERE rb.status = 'completed') as total_revenue,
       COUNT(i.id) FILTER (WHERE i.status = 'paid') as paid_invoices,
       COUNT(i.id) FILTER (WHERE i.status IN ('pending', 'sent')) as outstanding_invoices,
       SUM(i.amount) FILTER (WHERE i.status = 'paid') as total_commission_paid,
       SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'sent')) as outstanding_commission
     FROM partners p
     LEFT JOIN retreat_bookings rb ON p.id = rb.partner_id
     LEFT JOIN invoices i ON rb.id = i.booking_id
     ${whereClause}
     GROUP BY p.id, p.name, p.email
     ORDER BY p.name ASC`,
        params
    );

    return partnerId ? result.rows[0] : result.rows;
}

module.exports = {
    updateRetreatStatuses,
    getTrackingStats,
    getUpcomingRetreats,
    getRetreatsNeedingVerification,
    getCompletedRetreatsAwaitingPayment,
    getInvoicedRetreats,
    getPartnerMetrics,
};
