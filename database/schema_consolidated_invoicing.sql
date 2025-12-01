-- Schema updates for consolidated invoicing and flexible commission rates

-- First, update the partners table to support flexible commission structures
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat_rate'));

ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS flat_rate_amount DECIMAL(10, 2);

COMMENT ON COLUMN partners.commission_type IS 'Type of commission: percentage (% of revenue) or flat_rate (fixed $ per booking)';
COMMENT ON COLUMN partners.commission_rate IS 'Percentage rate (e.g., 15 for 15%) - used when commission_type is percentage';
COMMENT ON COLUMN partners.flat_rate_amount IS 'Flat dollar amount per booking (e.g., 200.00) - used when commission_type is flat_rate';

-- Update the invoices table to support consolidated monthly invoicing
-- Remove the booking_id foreign key constraint and make it nullable
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_fkey;
ALTER TABLE invoices ALTER COLUMN booking_id DROP NOT NULL;

-- Add billing_cycle column to group invoices by month
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS billing_cycle DATE;

COMMENT ON COLUMN invoices.billing_cycle IS 'The billing cycle month (YYYY-MM-01 format) this invoice covers';

-- Create a unique constraint to ensure one invoice per partner per billing cycle
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_partner_billing_cycle 
ON invoices(partner_id, billing_cycle) 
WHERE billing_cycle IS NOT NULL;

-- Create invoice_line_items table to link multiple bookings to one invoice
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    booking_id INTEGER NOT NULL REFERENCES retreat_bookings(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    retreat_date DATE NOT NULL,
    revenue DECIMAL(10, 2) NOT NULL,
    commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('percentage', 'flat_rate')),
    commission_rate DECIMAL(5, 2), -- Used for percentage (e.g., 15.00 for 15%)
    flat_rate_amount DECIMAL(10, 2), -- Used for flat rate (e.g., 200.00)
    line_item_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(invoice_id, booking_id)
);

COMMENT ON TABLE invoice_line_items IS 'Individual line items (bookings) that make up a consolidated invoice';
COMMENT ON COLUMN invoice_line_items.commission_type IS 'Type of commission used for this line item';
COMMENT ON COLUMN invoice_line_items.commission_rate IS 'Percentage rate applied (if commission_type is percentage)';
COMMENT ON COLUMN invoice_line_items.flat_rate_amount IS 'Flat rate applied (if commission_type is flat_rate)';
COMMENT ON COLUMN invoice_line_items.line_item_amount IS 'Calculated commission amount for this line item';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_booking ON invoice_line_items(booking_id);

-- Add a flag to retreat_bookings to track if a booking has been invoiced
ALTER TABLE retreat_bookings 
ADD COLUMN IF NOT EXISTS invoiced BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN retreat_bookings.invoiced IS 'Whether this booking has been included in an invoice';

-- Create a view for easy invoice summary queries
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.id as invoice_id,
    i.partner_id,
    p.name as partner_name,
    p.email as partner_email,
    i.billing_cycle,
    i.amount as total_amount,
    i.status,
    i.due_date,
    i.sent_date,
    i.paid_date,
    i.paypal_invoice_id,
    COUNT(ili.id) as line_item_count,
    STRING_AGG(DISTINCT ili.guest_name, ', ') as guest_names
FROM invoices i
JOIN partners p ON i.partner_id = p.id
LEFT JOIN invoice_line_items ili ON i.id = ili.invoice_id
WHERE i.billing_cycle IS NOT NULL
GROUP BY i.id, p.name, p.email;

COMMENT ON VIEW invoice_summary IS 'Summary view of consolidated invoices with line item counts';

-- Migration note: Existing invoices with booking_id will remain as-is
-- New invoices will use the consolidated approach with billing_cycle and line items
