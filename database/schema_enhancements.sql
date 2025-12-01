-- Additional tables for enhanced dashboard features

-- Notifications table (in-app notifications for admin)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('verification_overdue', 'payment_overdue', 'new_booking', 'invoice_paid', 'system_alert')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    related_booking_id INTEGER REFERENCES retreat_bookings(id) ON DELETE CASCADE,
    related_invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Email templates table (customizable email templates)
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    send_trigger VARCHAR(100),
    send_delay_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partner notes table (internal notes about partners)
CREATE TABLE IF NOT EXISTS partner_notes (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email activity log table (track all emails sent)
CREATE TABLE IF NOT EXISTS email_activity_log (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    template_key VARCHAR(100),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
    error_message TEXT,
    related_booking_id INTEGER REFERENCES retreat_bookings(id) ON DELETE SET NULL,
    related_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL
);

-- CSV upload history table
CREATE TABLE IF NOT EXISTS csv_upload_history (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    report_month DATE NOT NULL,
    records_total INTEGER NOT NULL,
    records_success INTEGER NOT NULL,
    records_failed INTEGER NOT NULL,
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_data TEXT
);

-- Create indexes
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_partner_notes_partner_id ON partner_notes(partner_id);
CREATE INDEX idx_email_activity_partner_id ON email_activity_log(partner_id);
CREATE INDEX idx_email_activity_sent_at ON email_activity_log(sent_at DESC);
CREATE INDEX idx_csv_upload_month ON csv_upload_history(report_month);

-- Create updated_at triggers
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_notes_updated_at BEFORE UPDATE ON partner_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (template_key, name, description, subject, html_body, variables, send_trigger, send_delay_days) VALUES
('monthly_report', 'Monthly Partner Report', 'Sent on the 10th of each month with traffic stats and verification form', 
 'Monthly Partner Report - <%= reportMonth %>', 
 '<!-- Use existing monthlyReport.html template -->', 
 '["partnerName", "reportMonth", "trafficDelivered", "warmLeadsSent", "verificationUrl"]',
 'monthly_scheduled', 0),

('verification_reminder', 'Verification Form Reminder', 'Sent on the 15th if form not submitted',
 'Reminder: Partner Verification Form Due',
 '<div style="font-family: Arial, sans-serif;"><h2>Verification Form Reminder</h2><p>Hello <%= partnerName %>,</p><p>Your monthly verification form is due. Please complete it at your earliest convenience.</p><p><a href="<%= verificationUrl %>">Complete Form</a></p></div>',
 '["partnerName", "verificationUrl", "deadline"]',
 'verification_overdue', 3),

('payment_reminder', 'Payment Overdue Reminder', 'Sent when payment is 7+ days overdue',
 'Payment Reminder - Invoice #<%= invoiceId %>',
 '<div style="font-family: Arial, sans-serif;"><h2>Payment Reminder</h2><p>Hello <%= partnerName %>,</p><p>This is a friendly reminder that Invoice #<%= invoiceId %> for $<%= amount %> is now overdue.</p><p><a href="<%= paypalUrl %>">View Invoice</a></p></div>',
 '["partnerName", "invoiceId", "amount", "paypalUrl", "daysOverdue"]',
 'payment_overdue', 7),

('invoice_notification', 'Invoice Created Notification', 'Sent when new invoice is created',
 'Invoice #<%= invoiceId %> - Commission Payment Due',
 '<!-- Use existing invoice notification template -->',
 '["partnerName", "invoiceId", "amount", "dueDate", "paypalUrl"]',
 'invoice_created', 0),

('welcome_partner', 'Welcome New Partner', 'Sent when partner is first enrolled',
 'Welcome to Psychedelics.com Partner Program',
 '<div style="font-family: Arial, sans-serif;"><h2>Welcome!</h2><p>Hello <%= partnerName %>,</p><p>Welcome to our partner program. We look forward to working with you!</p></div>',
 '["partnerName"]',
 'partner_created', 0)

ON CONFLICT (template_key) DO NOTHING;
