-- Partner Retreat Booking & Revenue Automation System
-- Database Schema

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    contact_info TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly traffic reports
CREATE TABLE IF NOT EXISTS monthly_traffic_reports (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    report_month DATE NOT NULL,
    traffic_delivered INTEGER DEFAULT 0,
    warm_leads_sent INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, report_month)
);

-- Retreat bookings
CREATE TABLE IF NOT EXISTS retreat_bookings (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    retreat_date DATE NOT NULL,
    expected_net_revenue DECIMAL(10,2) NOT NULL,
    reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'canceled', 'rescheduled')),
    final_net_revenue DECIMAL(10,2),
    verification_date TIMESTAMP,
    rescheduled_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES retreat_bookings(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    paypal_invoice_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'failed')),
    due_date DATE NOT NULL,
    sent_date TIMESTAMP,
    paid_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification forms
CREATE TABLE IF NOT EXISTS verification_forms (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    report_month DATE NOT NULL,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'submitted', 'overdue')),
    form_data JSONB,
    unique_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, report_month)
);

-- Create indexes for better query performance
CREATE INDEX idx_bookings_partner_id ON retreat_bookings(partner_id);
CREATE INDEX idx_bookings_status ON retreat_bookings(status);
CREATE INDEX idx_bookings_retreat_date ON retreat_bookings(retreat_date);
CREATE INDEX idx_invoices_partner_id ON invoices(partner_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_verification_forms_token ON verification_forms(unique_token);
CREATE INDEX idx_traffic_reports_partner_month ON monthly_traffic_reports(partner_id, report_month);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON retreat_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_forms_updated_at BEFORE UPDATE ON verification_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
