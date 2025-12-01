# Invoicing Logic Update

## Change Summary

**Date**: November 2025  
**Type**: Business Logic Enhancement

### What Changed

**Before**: Invoices were created exactly 30 days after a retreat was completed.

**After**: Invoices are now created during the next monthly reporting cycle, giving partners 30-50 days to pay depending on when the retreat occurred.

### Why This Change?

This aligns invoicing with your monthly reporting workflow and gives partners more predictable payment schedules. Instead of invoices arriving at random times throughout the month, they now arrive on the 10th of each month along with the monthly reports.

### How It Works

**New Logic**:
1. Wait minimum 30 days after retreat completion
2. Move to the next monthly reporting cycle
3. Invoice is due on the 10th of that month

**Examples**:
- Retreat on **January 15** → Invoice due **March 10** (~54 days)
- Retreat on **January 5** → Invoice due **March 10** (~64 days)
- Retreat on **February 20** → Invoice due **April 10** (~49 days)
- Retreat on **March 25** → Invoice due **May 10** (~46 days)

### Benefits

✅ **Aligned Workflow**: Invoices arrive with monthly reports  
✅ **Predictable Schedule**: Partners know invoices come on the 10th  
✅ **More Time to Pay**: 30-50 days instead of strict 30 days  
✅ **Easier Tracking**: All invoices for a month processed together  
✅ **Better Cash Flow**: Partners have more time to prepare payment  

### Files Modified

1. **utils/dateHelpers.js**
   - Added `calculateNextReportingCycleDueDate()` function
   - Calculates due date based on next reporting cycle

2. **services/invoiceService.js**
   - Updated `createInvoiceForBooking()` to use new date calculation
   - Modified `processCompletedRetreats()` query to check for 30-day minimum
   - Updated comments to reflect new logic

### Technical Details

**Function**: `calculateNextReportingCycleDueDate(retreatDate)`

```javascript
// Add 30 days minimum
date.setDate(date.getDate() + 30);

// Move to the next month (next reporting cycle)
date.setMonth(date.getMonth() + 1);

// Set to the 10th (reporting day)
date.setDate(10);
```

### Impact

- **No breaking changes**: Existing invoices are unaffected
- **Database**: No schema changes required
- **Partners**: Will appreciate the extra time and predictability
- **Admin**: Easier to manage all invoices on the same day each month

### Testing

To test the new logic:
1. Create a completed retreat with today's date
2. Wait for daily invoice processing (10:00 AM)
3. Verify invoice due date is set to the 10th of the month after next month
4. Confirm invoice appears in dashboard with correct due date

---

**Status**: ✅ Implemented and Ready for Testing
