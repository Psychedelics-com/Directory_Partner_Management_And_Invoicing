# Partner Retreat Automation System
## Technical Project Overview

### 1. General Description
This project is an automated partner management system for Psychedelics.com. It solves the problem of manual commission management, reporting, and invoicing for 250+ retreat centers.

**Key Goal**: Fully automate the monthly reporting and invoicing cycle, reducing manual work from 8 hours to 15 minutes per month.

### 2. System Architecture

**Tech Stack:**
- **Backend**: Node.js (Express)
- **Database**: PostgreSQL
- **Frontend**: Vanilla JS + HTML/CSS (Dashboard)
- **Integrations**: PayPal API (Invoicing), Gmail API (Sending reports), Google OAuth (Admin Auth)

**Core Components:**
1.  **Admin Dashboard**: Central hub for managing partners, invoices, and settings.
2.  **Partner Portal**: External interface for partners (no login required, access via unique token) to verify bookings.
3.  **Scheduler Service**: Automated cron jobs for sending reports and checking payments.
4.  **Invoice Service**: Logic for calculating commissions and generating invoices.

### 3. Key Business Processes

#### A. Monthly Reporting (Day 10)
1.  Admin uploads a CSV with traffic data.
2.  System automatically sends personalized emails to all partners.
3.  Email contains a unique link to the **Partner Portal**.

#### B. Verification & Booking Management
Partner visits the portal and sees:
-   **Past 3 Months**: Retreats requiring verification (Completed/Canceled).
-   **Next 12 Months**: Upcoming bookings (can reschedule or cancel).
-   **New Feature**: Ability to manually add a new booking ("Report New Booking").

#### C. Real-time Invoicing
As soon as a partner submits the verification form:
1.  System checks for completed retreats.
2.  If a retreat was completed > 30 days ago -> **Consolidated invoice is generated**.
3.  Invoice is sent via PayPal API instantly.
4.  **Payment Terms**: Due in 72 hours from issuance.

#### D. Flexible Commission System
Each partner can have custom settings:
-   **Percentage**: % of revenue (default 15%).
-   **Flat Rate**: Fixed amount per booking (e.g., $200).
-   Configurable via Admin Dashboard.

### 4. Database Structure (Key Tables)

-   `partners`: Core info, commission settings (`commission_type`, `flat_rate_amount`).
-   `retreat_bookings`: All bookings (statuses: scheduled, completed, canceled).
-   `invoices`: Consolidated invoices.
-   `invoice_line_items`: Invoice details (specific bookings within one invoice).
-   `verification_forms`: History of sent forms and tokens.

### 5. API Endpoints (New)

-   `POST /api/verification/submit-booking/:token` - Partner adds a booking.
-   `POST /api/admin/partners` - Create partner with commission settings.
-   `GET /api/invoices/detailed` - Get invoices with line item details.

### 6. Project Status
System is fully implemented and production-ready.
-   ✅ Automated report dispatch
-   ✅ Partner Portal (verification + future management)
-   ✅ Real-time invoicing via PayPal
-   ✅ Admin Panel with analytics and management
-   ✅ Overdue payment notifications

### 7. Developer Instructions
1.  **Deployment**: Standard Node.js application. Requires PostgreSQL and environment variables (PayPal Client ID/Secret, Google Credentials).
2.  **Migrations**: SQL scripts are located in the `database/` folder.
3.  **Logs**: System writes logs to console and (optionally) to `email_activity_log` table.

---
*Document prepared for the Lead Developer.*
