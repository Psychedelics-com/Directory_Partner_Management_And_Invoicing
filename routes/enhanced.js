const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { ensureAuthenticated } = require('../config/auth');
const notificationService = require('../services/notificationService');
const emailTemplateService = require('../services/emailTemplateService');
const partnerNotesService = require('../services/partnerNotesService');

/**
 * GET /api/notifications
 * Get all notifications
 */
router.get('/notifications', ensureAuthenticated, async (req, res) => {
    try {
        const unread = req.query.unread === 'true';

        const notifications = unread
            ? await notificationService.getUnreadNotifications()
            : await notificationService.getAllNotifications();

        const counts = await notificationService.getNotificationCounts();

        res.json({ notifications, counts });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post('/notifications/:id/read', ensureAuthenticated, async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/notifications/read-all', ensureAuthenticated, async (req, res) => {
    try {
        await notificationService.markAllAsRead();
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/notifications/:id', ensureAuthenticated, async (req, res) => {
    try {
        await notificationService.deleteNotification(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

/**
 * GET /api/email-templates
 * Get all email templates
 */
router.get('/email-templates', ensureAuthenticated, async (req, res) => {
    try {
        const templates = await emailTemplateService.getAllTemplates();
        res.json({ templates });
    } catch (error) {
        console.error('Error fetching email templates:', error);
        res.status(500).json({ error: 'Failed to fetch email templates' });
    }
});

/**
 * PUT /api/email-templates/:key
 * Update email template
 */
router.put('/email-templates/:key', ensureAuthenticated, async (req, res) => {
    try {
        const template = await emailTemplateService.updateTemplate(req.params.key, req.body);
        res.json({ success: true, template });
    } catch (error) {
        console.error('Error updating email template:', error);
        res.status(500).json({ error: 'Failed to update email template' });
    }
});

/**
 * GET /api/email-activity
 * Get email activity log
 */
router.get('/email-activity', ensureAuthenticated, async (req, res) => {
    try {
        const { partner_id, limit } = req.query;

        const activity = partner_id
            ? await emailTemplateService.getPartnerEmailActivity(parseInt(partner_id), parseInt(limit) || 50)
            : await emailTemplateService.getAllEmailActivity(parseInt(limit) || 100);

        res.json({ activity });
    } catch (error) {
        console.error('Error fetching email activity:', error);
        res.status(500).json({ error: 'Failed to fetch email activity' });
    }
});

/**
 * GET /api/partners/:id/notes
 * Get notes for partner
 */
router.get('/partners/:id/notes', ensureAuthenticated, async (req, res) => {
    try {
        const notes = await partnerNotesService.getPartnerNotes(req.params.id);
        res.json({ notes });
    } catch (error) {
        console.error('Error fetching partner notes:', error);
        res.status(500).json({ error: 'Failed to fetch partner notes' });
    }
});

/**
 * POST /api/partners/:id/notes
 * Add note to partner
 */
router.post('/partners/:id/notes', ensureAuthenticated, async (req, res) => {
    try {
        const { note } = req.body;
        const createdBy = req.user?.emails?.[0]?.value || 'admin';

        const newNote = await partnerNotesService.addNote(req.params.id, note, createdBy);
        res.json({ success: true, note: newNote });
    } catch (error) {
        console.error('Error adding partner note:', error);
        res.status(500).json({ error: 'Failed to add partner note' });
    }
});

/**
 * DELETE /api/notes/:id
 * Delete note
 */
router.delete('/notes/:id', ensureAuthenticated, async (req, res) => {
    try {
        await partnerNotesService.deleteNote(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

/**
 * GET /api/partners/status-overview
 * Get comprehensive partner status overview
 */
router.get('/partners/status-overview', ensureAuthenticated, async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.email,
        p.commission_rate,
        p.commission_type,
        p.flat_rate_amount,
        
        -- Verification status
        vf.status as verification_status,
        vf.sent_date as last_report_sent,
        vf.submitted_date as last_report_submitted,
        CASE 
          WHEN vf.status = 'sent' AND vf.sent_date < CURRENT_DATE - INTERVAL '3 days' THEN true
          ELSE false
        END as verification_overdue,
        
        -- Booking counts
        COUNT(DISTINCT rb.id) FILTER (WHERE rb.status = 'scheduled' AND rb.retreat_date > CURRENT_DATE) as upcoming_bookings,
        COUNT(DISTINCT rb.id) FILTER (WHERE rb.status = 'scheduled' AND rb.retreat_date <= CURRENT_DATE) as needs_verification,
        COUNT(DISTINCT rb.id) FILTER (WHERE rb.status = 'completed') as completed_bookings,
        
        -- Invoice status (for overdue tracking)
        COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('pending', 'sent')) as outstanding_invoices,
        COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('pending', 'sent') AND i.due_date < CURRENT_DATE - INTERVAL '7 days') as overdue_invoices,
        SUM(i.amount) FILTER (WHERE i.status IN ('pending', 'sent') AND i.due_date < CURRENT_DATE - INTERVAL '7 days') as overdue_amount,
        
        -- Total commission owed based on completed bookings
        CASE 
          WHEN p.commission_type = 'flat_rate' THEN 
            COUNT(DISTINCT rb.id) FILTER (WHERE rb.status = 'completed') * COALESCE(p.flat_rate_amount, 0)
          ELSE 
            SUM(rb.final_net_revenue) FILTER (WHERE rb.status = 'completed') * (COALESCE(p.commission_rate, 15) / 100.0)
        END as total_owed,
        
        -- Revenue
        SUM(rb.final_net_revenue) FILTER (WHERE rb.status = 'completed') as total_revenue,
        SUM(i.amount) FILTER (WHERE i.status = 'paid') as total_commission_paid,
        
        -- Latest activity
        MAX(vf.submitted_date) as last_activity_date
        
      FROM partners p
      LEFT JOIN verification_forms vf ON p.id = vf.partner_id 
        AND vf.report_month = (SELECT MAX(report_month) FROM verification_forms WHERE partner_id = p.id)
      LEFT JOIN retreat_bookings rb ON p.id = rb.partner_id
      LEFT JOIN invoices i ON p.id = i.partner_id
      
      GROUP BY p.id, p.name, p.email, p.commission_rate, p.commission_type, p.flat_rate_amount, vf.status, vf.sent_date, vf.submitted_date
      ORDER BY p.name
    `);

        res.json({ partners: result.rows });
    } catch (error) {
        console.error('Error fetching partner status overview:', error);
        res.status(500).json({ error: 'Failed to fetch partner status overview' });
    }
});

/**
 * GET /api/invoices/detailed
 * Get detailed invoice list with filters
 */
router.get('/invoices/detailed', ensureAuthenticated, async (req, res) => {
    try {
        const { status, partner_id } = req.query;

        let whereClause = '1=1';
        const params = [];

        if (status) {
            params.push(status);
            whereClause += ` AND i.status = $${params.length}`;
        }

        if (partner_id) {
            params.push(partner_id);
            whereClause += ` AND i.partner_id = $${params.length}`;
        }

        const result = await query(`
      SELECT 
        i.*,
        p.name as partner_name,
        p.email as partner_email,
        rb.guest_name,
        rb.retreat_date,
        rb.final_net_revenue,
        CASE 
          WHEN i.status IN ('pending', 'sent') AND i.due_date < CURRENT_DATE THEN 
            CURRENT_DATE - i.due_date
          ELSE 0
        END as days_overdue
      FROM invoices i
      JOIN partners p ON i.partner_id = p.id
      JOIN retreat_bookings rb ON i.booking_id = rb.id
      WHERE ${whereClause}
      ORDER BY i.created_at DESC
    `, params);

        res.json({ invoices: result.rows });
    } catch (error) {
        console.error('Error fetching detailed invoices:', error);
        res.status(500).json({ error: 'Failed to fetch detailed invoices' });
    }
});

/**
 * GET /api/financial/summary
 * Get financial summary and charts data
 */
router.get('/financial/summary', ensureAuthenticated, async (req, res) => {
    try {
        // Monthly revenue trend (last 12 months)
        const revenueResult = await query(`
      SELECT 
        TO_CHAR(rb.retreat_date, 'YYYY-MM') as month,
        SUM(rb.final_net_revenue) as total_revenue,
        SUM(rb.final_net_revenue * 0.15) as commission_revenue,
        COUNT(*) as booking_count
      FROM retreat_bookings rb
      WHERE rb.status = 'completed'
        AND rb.retreat_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(rb.retreat_date, 'YYYY-MM')
      ORDER BY month
    `);

        // Partner revenue breakdown
        const partnerRevenueResult = await query(`
      SELECT 
        p.name as partner_name,
        SUM(rb.final_net_revenue) as total_revenue,
        SUM(rb.final_net_revenue * p.commission_rate / 100) as commission_earned,
        COUNT(rb.id) as booking_count
      FROM partners p
      LEFT JOIN retreat_bookings rb ON p.id = rb.partner_id AND rb.status = 'completed'
      GROUP BY p.id, p.name
      HAVING COUNT(rb.id) > 0
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

        // Payment status summary
        const paymentStatusResult = await query(`
      SELECT 
        i.status,
        COUNT(*) as count,
        SUM(i.amount) as total_amount
      FROM invoices i
      GROUP BY i.status
    `);

        res.json({
            monthlyRevenue: revenueResult.rows,
            topPartners: partnerRevenueResult.rows,
            paymentStatus: paymentStatusResult.rows,
        });
    } catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({ error: 'Failed to fetch financial summary' });
    }
});

module.exports = router;
