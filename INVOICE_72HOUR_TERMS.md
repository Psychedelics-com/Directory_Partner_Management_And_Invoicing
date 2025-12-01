# Invoice Payment Terms Update

## Change Summary

**Date**: November 2025  
**Type**: Payment Terms Modification

### What Changed

**Before**: Invoice due on the 10th of the next month (30-50 days from retreat)

**After**: Invoice due in **72 hours** from when invoice is sent

### Why This Change?

Since invoices are only created for retreats that are **30+ days old**, partners have already had plenty of time. The 72-hour payment window creates urgency while still being fair.

### Timeline Example

**Old System:**
- Retreat on Jan 15
- Partner verifies on March 12 (57 days later)
- Invoice sent March 12
- Payment due April 10 (29 more days)
- **Total: 86 days from retreat to payment due**

**New System:**
- Retreat on Jan 15
- Partner verifies on March 12 (57 days later)
- Invoice sent March 12
- Payment due March 15 (72 hours)
- **Total: 60 days from retreat to payment due**

### Benefits

✅ **Faster Payment**: Cash flow improved by ~25 days  
✅ **Still Fair**: Partners already had 30+ days since retreat  
✅ **Creates Urgency**: 72 hours is short enough to prioritize  
✅ **Clearer Terms**: Simple "pay within 3 days" message  

### Files Modified

1. **utils/dateHelpers.js**
   - Removed `calculateNextReportingCycleDueDate()`
   - Added `calculateInvoiceDueDate()` - returns 72 hours from now

2. **services/invoiceService.js**
   - Updated to use `calculateInvoiceDueDate()`
   - Invoice due date now set to 72 hours from creation

### Payment Terms

**Clear Terms for Partners:**
- Retreats must be 30+ days old before invoicing
- Once verified, invoice sent immediately
- Payment due in 72 hours
- Late payments flagged after 7 days

---

**Status**: ✅ Implemented
