# Partner Retreat Automation System - Admin Dashboard Enhancement

This document provides instructions for adding partner management and CSV import features to the admin dashboard.

## New Features Added

### 1. Partner Management
- View all partners in a table
- Add new partners via form
- Edit existing partners
- Delete partners

### 2. CSV Traffic Import
- Upload CSV file with partner traffic metrics
- Automatic validation and import
- Preview results before confirming

## CSV Format Required

The CSV file must have the following columns:

```csv
partner_email,traffic_delivered,warm_leads_sent
contact@sacredvalley.com,1250,45
info@ayahuascahealing.com,980,32
hello@psilocybinwellness.com,1500,58
```

**Required Columns:**
- `partner_email` - Email address of the partner (must match existing partner)
- `traffic_delivered` - Number of visitors sent to partner
- `warm_leads_sent` - Number of qualified leads sent

## API Endpoints

### Partner Management
- `GET /api/admin/partners` - List all partners
- `POST /api/admin/partners` - Create new partner
- `PUT /api/admin/partners/:id` - Update partner
- `DELETE /api/admin/partners/:id` - Delete partner

### Traffic Import
- `POST /api/admin/traffic/upload` - Upload CSV file
- `GET /api/admin/traffic/:month` - Get traffic reports for month

## Implementation Notes

The admin dashboard has been enhanced with:
- Partner management modal forms
- CSV file upload interface
- Real-time validation feedback
- Success/error notifications

All admin routes are protected by Google OAuth authentication.
