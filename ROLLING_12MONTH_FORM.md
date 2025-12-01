# Rolling 12-Month Verification Form Update

## Change Summary

**Date**: November 2025  
**Type**: Feature Enhancement

### What Changed

**Before**: Verification form only showed past retreats that needed verification (status = 'scheduled' and date <= today)

**After**: Verification form shows **all bookings from the last 12 months** on a rolling basis, including:
- Past retreats (can confirm, cancel, or reschedule)
- Current retreats (happening now)
- Future retreats (can reschedule or cancel in advance)

### Why This Change?

Partners can now manage their entire booking pipeline in one place:
- ✅ Confirm past retreats that happened
- ❌ Cancel retreats that didn't happen
- 📅 Reschedule upcoming retreats
- 👀 See their complete 12-month view

### How It Works

**Rolling 12-Month Window**:
- Shows bookings from 12 months ago to 12 months in the future
- Updates automatically each month
- Partners see their complete booking history and pipeline

**Example on March 10, 2025**:
- Shows bookings from **March 10, 2024** to **March 10, 2026**
- Includes all statuses: scheduled, completed, canceled, rescheduled
- Partners can update any booking in this window

### Benefits

✅ **Complete View**: Partners see all their bookings in one place  
✅ **Proactive Management**: Can reschedule future retreats before they happen  
✅ **Better Accuracy**: Partners can correct any booking at any time  
✅ **Less Confusion**: One comprehensive list instead of "what needs verification"  
✅ **Flexible**: Partners can submit forms multiple times to update bookings  

### Example Use Cases

**Use Case 1: Confirm Past Retreats**
- Partner sees retreat from Jan 15 (2 months ago)
- Marks as "Completed" with final revenue
- Gets invoiced immediately (if 30+ days old)

**Use Case 2: Reschedule Future Retreat**
- Partner sees retreat scheduled for May 20
- Guest called to reschedule to June 15
- Partner updates it now (3 months in advance)
- No last-minute surprises

**Use Case 3: Cancel Recent Booking**
- Partner sees retreat from Feb 28 (10 days ago)
- Guest no-showed
- Marks as "Canceled"
- No invoice created

### Files Modified

**routes/verificationForm.js**:
```javascript
// Old query - only past scheduled retreats
WHERE status = 'scheduled' AND retreat_date <= CURRENT_DATE

// New query - rolling 12-month window
WHERE retreat_date >= CURRENT_DATE - INTERVAL '12 months'
AND retreat_date <= CURRENT_DATE + INTERVAL '12 months'
```

### Impact

- **No breaking changes**: Existing functionality still works
- **Database**: No schema changes required
- **Partners**: Better experience with complete visibility
- **Admin**: More accurate data as partners can update proactively

### Updated Workflow

**Day 10**: Partner receives monthly report with verification form link

**Partner clicks link and sees**:
```
Your Bookings (Last 12 Months)

PAST RETREATS:
✅ John Smith - Jan 5, 2025 - Scheduled → [Confirm] [Cancel] [Reschedule]
✅ Jane Doe - Jan 12, 2025 - Scheduled → [Confirm] [Cancel] [Reschedule]
✅ Bob Wilson - Feb 28, 2025 - Scheduled → [Confirm] [Cancel] [Reschedule]

UPCOMING RETREATS:
📅 Alice Cooper - May 20, 2025 - Scheduled → [Keep] [Cancel] [Reschedule]
📅 David Lee - Jun 15, 2025 - Scheduled → [Keep] [Cancel] [Reschedule]

ALREADY PROCESSED:
✓ Mike Jones - Dec 10, 2024 - Completed - $5,000
✗ Sarah Williams - Nov 5, 2024 - Canceled
```

Partner can update any of these bookings, not just the past ones.

---

**Status**: ✅ Implemented and Ready for Testing
