# Consolidated Invoicing & Flexible Commission Rates

## Implementation Summary

**Date**: November 2025  
**Status**: ✅ Complete

---

## What Changed

### 1. Consolidated Monthly Invoicing

**Before**: One invoice per completed retreat booking  
**After**: One invoice per partner per billing cycle with multiple line items

**Example**:
```
Partner: Sacred Valley Retreats
Billing Cycle: March 2025
Invoice #456 - Due March 10, 2025

Line Items:
1. Retreat - John Smith (Jan 5) - Revenue: $5,000 - Commission: $750
2. Retreat - Jane Doe (Jan 12) - Revenue: $3,500 - Commission: $525  
3. Retreat - Bob Wilson (Jan 28) - Revenue: $4,200 - Commission: $630

Total Due: $1,905
```

### 2. Flexible Commission Structure

Partners can now have either:
- **Percentage-based**: 15% of revenue (default)
- **Flat-rate**: $200 per booking (override)
- **Custom percentage**: Any % per partner (e.g., VIP gets 10%)

---

## Database Changes

### New Table: `invoice_line_items`
```sql
CREATE TABLE invoice_line_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    booking_id INTEGER REFERENCES retreat_bookings(id),
    guest_name VARCHAR(255),
    retreat_date DATE,
    revenue DECIMAL(10, 2),
    commission_type VARCHAR(20), -- 'percentage' or 'flat_rate'
    commission_rate DECIMAL(5, 2), -- e.g., 15.00 for 15%
    flat_rate_amount DECIMAL(10, 2), -- e.g., 200.00
    line_item_amount DECIMAL(10, 2), -- calculated commission
    created_at TIMESTAMP
);
```

### Updated Table: `partners`
```sql
ALTER TABLE partners 
ADD COLUMN commission_type VARCHAR(20) DEFAULT 'percentage';

ALTER TABLE partners 
ADD COLUMN flat_rate_amount DECIMAL(10, 2);
```

### Updated Table: `invoices`
```sql
ALTER TABLE invoices 
ADD COLUMN billing_cycle DATE;

-- booking_id is now nullable (old invoices keep it, new ones use line items)
ALTER TABLE invoices ALTER COLUMN booking_id DROP NOT NULL;
```

### Updated Table: `retreat_bookings`
```sql
ALTER TABLE retreat_bookings 
ADD COLUMN invoiced BOOLEAN DEFAULT FALSE;
```

---

## Code Changes

### Files Modified:

1. **database/schema_consolidated_invoicing.sql** [NEW]
   - Complete schema migration for consolidated invoicing
   - Adds flexible commission structure
   - Creates `invoice_line_items` table
   - Adds `invoice_summary` view

2. **services/invoiceService.js** [REWRITTEN]
   - `calculateCommission()` - Supports percentage or flat-rate
   - `createConsolidatedInvoice()` - Creates one invoice with multiple line items
   - `processConsolidatedInvoicing()` - Processes all partners monthly
   - Removed `createInvoiceForBooking()` (old per-booking logic)

3. **services/paypalClient.js** [ENHANCED]
   - Added `buildConsolidatedInvoiceData()` method
   - Supports multiple line items in PayPal invoice
   - Shows commission type in line item descriptions

4. **services/scheduler.js** [UPDATED]
   - Changed from daily invoicing to monthly (10th of month)
   - Calls `processConsolidatedInvoicing()` instead of `processCompletedRetreats()`

---

## How It Works

### Monthly Invoicing Flow:

**Day 10 of Each Month @ 10:00 AM**:
1. System identifies all partners with completed retreats (30+ days old, not yet invoiced)
2. For each partner:
   - Calculates commission for each booking (percentage or flat-rate)
   - Creates ONE invoice with multiple line items
   - Sends consolidated PayPal invoice
   - Marks all bookings as `invoiced = TRUE`
   - Sends email notification to partner
   - Creates admin notification

### Commission Calculation:

**Percentage-based** (default):
```javascript
commission = revenue * (commission_rate / 100)
// Example: $5,000 * 0.15 = $750
```

**Flat-rate** (override):
```javascript
commission = flat_rate_amount
// Example: $200 (regardless of revenue)
```

---

## Admin Dashboard Updates Needed

### Partner Management:
- Add commission type selector (Percentage / Flat Rate)
- Add commission rate input (for percentage)
- Add flat rate amount input (for flat rate)

### Invoice View:
- Show line items for each invoice
- Display commission type per line item
- Show billing cycle instead of single booking

---

## Benefits

✅ **Cleaner for Partners**: One invoice per month instead of multiple  
✅ **Easier Tracking**: One payment to track per partner per month  
✅ **Professional**: Standard business practice  
✅ **Simpler Accounting**: Both sides have cleaner books  
✅ **Lower PayPal Fees**: One transaction instead of multiple  
✅ **Flexible Pricing**: Support different commission structures  
✅ **VIP Treatment**: Offer flat rates or custom percentages to key partners  

---

## Migration Notes

**Backward Compatibility**:
- Existing invoices with `booking_id` remain unchanged
- New invoices use `billing_cycle` and `invoice_line_items`
- Both systems can coexist during transition

**To Apply Changes**:
```bash
psql -U postgres -d partner_retreat_automation -f database/schema_consolidated_invoicing.sql
```

---

## Testing Checklist

- [ ] Create partner with percentage commission (15%)
- [ ] Create partner with flat-rate commission ($200)
- [ ] Complete 3 retreats for same partner (30+ days ago)
- [ ] Run `processConsolidatedInvoicing()`
- [ ] Verify ONE invoice created with 3 line items
- [ ] Check PayPal invoice shows all line items correctly
- [ ] Verify commission calculations (percentage vs flat-rate)
- [ ] Confirm bookings marked as `invoiced = TRUE`
- [ ] Test payment tracking still works
- [ ] Verify email notification sent

---

## Next Steps

1. ✅ Run database migration
2. ⏳ Update admin dashboard UI for commission settings
3. ⏳ Update invoice detail view to show line items
4. ⏳ Test with sample data
5. ⏳ Deploy to production

---

**Status**: ✅ Core Implementation Complete  
**Remaining**: Admin UI updates for managing commission settings
