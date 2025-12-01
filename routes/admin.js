const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const router = express.Router();
const { query, transaction } = require('../config/database');
const { ensureAuthenticated } = require('../config/auth');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /admin/partners
 * View all partners
 */
router.get('/partners', ensureAuthenticated, async (req, res) => {
    try {
        const result = await query('SELECT * FROM partners ORDER BY name');
        res.json({ partners: result.rows });
    } catch (error) {
        console.error('Error fetching partners:', error);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

/**
 * POST /admin/partners
 * Create new partner
 */
router.post('/partners', ensureAuthenticated, async (req, res) => {
    try {
        const { name, email, contact_info, commission_rate } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const result = await query(
            `INSERT INTO partners (name, email, contact_info, commission_rate, commission_type, flat_rate_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [name, email, contact_info || null, commission_rate || 15.0, req.body.commission_type || 'percentage', req.body.flat_rate_amount || null]
        );

        res.json({ success: true, partner: result.rows[0] });
    } catch (error) {
        console.error('Error creating partner:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'Partner with this email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create partner' });
        }
    }
});

/**
 * PUT /admin/partners/:id
 * Update partner
 */
router.put('/partners/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, contact_info, commission_rate } = req.body;

        const result = await query(
            `UPDATE partners 
       SET name = $1, email = $2, contact_info = $3, commission_rate = $4, commission_type = $5, flat_rate_amount = $6
       WHERE id = $7
       RETURNING *`,
            [name, email, contact_info, commission_rate, req.body.commission_type, req.body.flat_rate_amount, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        res.json({ success: true, partner: result.rows[0] });
    } catch (error) {
        console.error('Error updating partner:', error);
        res.status(500).json({ error: 'Failed to update partner' });
    }
});

/**
 * DELETE /admin/partners/:id
 * Delete partner
 */
router.delete('/partners/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query('DELETE FROM partners WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting partner:', error);
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

/**
 * POST /admin/traffic/upload
 * Upload CSV file with traffic metrics
 */
router.post('/traffic/upload', ensureAuthenticated, upload.single('csvFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { reportMonth } = req.body;
        if (!reportMonth) {
            return res.status(400).json({ error: 'Report month is required (YYYY-MM format)' });
        }

        // Parse CSV
        const csvContent = req.file.buffer.toString('utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        // Validate CSV structure
        const requiredColumns = ['partner_email', 'traffic_delivered', 'warm_leads_sent'];
        const firstRecord = records[0] || {};
        const missingColumns = requiredColumns.filter(col => !(col in firstRecord));

        if (missingColumns.length > 0) {
            return res.status(400).json({
                error: `Missing required columns: ${missingColumns.join(', ')}`,
                requiredColumns,
            });
        }

        // Process records
        const results = {
            total: records.length,
            success: 0,
            failed: 0,
            errors: [],
        };

        await transaction(async (client) => {
            for (const record of records) {
                try {
                    // Find partner by email
                    const partnerResult = await client.query(
                        'SELECT id FROM partners WHERE email = $1',
                        [record.partner_email]
                    );

                    if (partnerResult.rows.length === 0) {
                        results.failed++;
                        results.errors.push({
                            email: record.partner_email,
                            error: 'Partner not found',
                        });
                        continue;
                    }

                    const partnerId = partnerResult.rows[0].id;
                    const trafficDelivered = parseInt(record.traffic_delivered) || 0;
                    const warmLeadsSent = parseInt(record.warm_leads_sent) || 0;

                    // Insert or update traffic report
                    await client.query(
                        `INSERT INTO monthly_traffic_reports 
             (partner_id, report_month, traffic_delivered, warm_leads_sent)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (partner_id, report_month)
             DO UPDATE SET 
               traffic_delivered = EXCLUDED.traffic_delivered,
               warm_leads_sent = EXCLUDED.warm_leads_sent`,
                        [partnerId, `${reportMonth}-01`, trafficDelivered, warmLeadsSent]
                    );

                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        email: record.partner_email,
                        error: error.message,
                    });
                }
            }
        });

        res.json({
            success: true,
            message: `Imported ${results.success} of ${results.total} records`,
            results,
        });
    } catch (error) {
        console.error('Error uploading traffic CSV:', error);
        res.status(500).json({ error: 'Failed to process CSV file' });
    }
});

/**
 * GET /admin/traffic/:month
 * Get traffic reports for a specific month
 */
router.get('/traffic/:month', ensureAuthenticated, async (req, res) => {
    try {
        const { month } = req.params;

        const result = await query(
            `SELECT mtr.*, p.name as partner_name, p.email as partner_email
       FROM monthly_traffic_reports mtr
       JOIN partners p ON mtr.partner_id = p.id
       WHERE mtr.report_month = $1
       ORDER BY p.name`,
            [`${month}-01`]
        );

        res.json({ reports: result.rows });
    } catch (error) {
        console.error('Error fetching traffic reports:', error);
        res.status(500).json({ error: 'Failed to fetch traffic reports' });
    }
});

module.exports = router;
