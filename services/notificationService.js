const { query } = require('../config/database');

/**
 * Create notification
 * @param {Object} notification - Notification data
 * @returns {Promise<Object>} - Created notification
 */
async function createNotification({ type, title, message, partnerId, bookingId, invoiceId }) {
    const result = await query(
        `INSERT INTO notifications 
     (type, title, message, related_partner_id, related_booking_id, related_invoice_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
        [type, title, message, partnerId || null, bookingId || null, invoiceId || null]
    );

    return result.rows[0];
}

/**
 * Get unread notifications
 * @param {number} limit - Maximum number of notifications to return
 * @returns {Promise<Array>} - Array of notifications
 */
async function getUnreadNotifications(limit = 50) {
    const result = await query(
        `SELECT n.*, p.name as partner_name
     FROM notifications n
     LEFT JOIN partners p ON n.related_partner_id = p.id
     WHERE n.is_read = FALSE
     ORDER BY n.created_at DESC
     LIMIT $1`,
        [limit]
    );

    return result.rows;
}

/**
 * Get all notifications
 * @param {number} limit - Maximum number of notifications to return
 * @returns {Promise<Array>} - Array of notifications
 */
async function getAllNotifications(limit = 100) {
    const result = await query(
        `SELECT n.*, p.name as partner_name
     FROM notifications n
     LEFT JOIN partners p ON n.related_partner_id = p.id
     ORDER BY n.created_at DESC
     LIMIT $1`,
        [limit]
    );

    return result.rows;
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<void>}
 */
async function markAsRead(notificationId) {
    await query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1',
        [notificationId]
    );
}

/**
 * Mark all notifications as read
 * @returns {Promise<void>}
 */
async function markAllAsRead() {
    await query('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');
}

/**
 * Delete notification
 * @param {number} notificationId - Notification ID
 * @returns {Promise<void>}
 */
async function deleteNotification(notificationId) {
    await query('DELETE FROM notifications WHERE id = $1', [notificationId]);
}

/**
 * Get notification count
 * @returns {Promise<Object>} - Notification counts
 */
async function getNotificationCounts() {
    const result = await query(
        `SELECT 
       COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
       COUNT(*) as total_count
     FROM notifications`
    );

    return result.rows[0];
}

/**
 * Check for overdue verifications and create notifications
 * @returns {Promise<number>} - Number of notifications created
 */
async function checkOverdueVerifications() {
    const result = await query(
        `SELECT vf.*, p.name as partner_name, p.id as partner_id
     FROM verification_forms vf
     JOIN partners p ON vf.partner_id = p.id
     WHERE vf.status = 'sent'
     AND vf.sent_date < CURRENT_DATE - INTERVAL '3 days'`
    );

    let count = 0;
    for (const form of result.rows) {
        // Check if notification already exists
        const existing = await query(
            `SELECT id FROM notifications 
       WHERE type = 'verification_overdue' 
       AND related_partner_id = $1 
       AND created_at > CURRENT_DATE - INTERVAL '1 day'`,
            [form.partner_id]
        );

        if (existing.rows.length === 0) {
            await createNotification({
                type: 'verification_overdue',
                title: 'Verification Form Overdue',
                message: `${form.partner_name} has not submitted their verification form (3+ days overdue)`,
                partnerId: form.partner_id,
            });
            count++;
        }
    }

    return count;
}

/**
 * Check for overdue payments and create notifications
 * @returns {Promise<number>} - Number of notifications created
 */
async function checkOverduePayments() {
    const result = await query(
        `SELECT i.*, p.name as partner_name, p.id as partner_id
     FROM invoices i
     JOIN partners p ON i.partner_id = p.id
     WHERE i.status IN ('pending', 'sent')
     AND i.due_date < CURRENT_DATE - INTERVAL '7 days'`
    );

    let count = 0;
    for (const invoice of result.rows) {
        // Check if notification already exists
        const existing = await query(
            `SELECT id FROM notifications 
       WHERE type = 'payment_overdue' 
       AND related_invoice_id = $1 
       AND created_at > CURRENT_DATE - INTERVAL '1 day'`,
            [invoice.id]
        );

        if (existing.rows.length === 0) {
            await createNotification({
                type: 'payment_overdue',
                title: 'Payment Overdue',
                message: `${invoice.partner_name} has an overdue payment of $${invoice.amount.toFixed(2)} (Invoice #${invoice.id})`,
                partnerId: invoice.partner_id,
                invoiceId: invoice.id,
            });
            count++;
        }
    }

    return count;
}

module.exports = {
    createNotification,
    getUnreadNotifications,
    getAllNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationCounts,
    checkOverdueVerifications,
    checkOverduePayments,
};
