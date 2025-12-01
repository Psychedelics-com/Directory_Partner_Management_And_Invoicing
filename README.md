# Partner Retreat Booking & Revenue Automation System

A comprehensive automated workflow system that manages monthly partner reporting, retreat booking verification, and commission invoicing for psychedelics.com's partner retreat centers.

## Features

- **Automated Monthly Reports**: Sends partners traffic stats, warm leads, and scheduled retreat bookings on the 10th of each month
- **Verification Workflow**: Interactive web forms for partners to verify completed, canceled, or rescheduled retreats
- **Net-30 Invoicing**: Automatically generates and sends PayPal invoices 30 days after retreat completion
- **Admin Dashboard**: Real-time tracking of retreats, invoices, and partner performance
- **Email Notifications**: Automated emails for reports, reminders, and invoice notifications

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Email**: SendGrid
- **Payments**: PayPal Invoicing API
- **Scheduling**: node-cron

## Installation

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- SendGrid account and API key
- PayPal Business account with API credentials

### Setup Steps

1. **Clone the repository** (or navigate to the project directory)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb partner_retreat_automation
   
   # Run schema
   psql -U postgres -d partner_retreat_automation -f database/schema.sql
   ```

4. **Configure environment variables**
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env with your credentials
   nano .env
   ```

   Required environment variables:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `SENDGRID_API_KEY`
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
   - `FROM_EMAIL`, `PAYPAL_MERCHANT_EMAIL`

5. **Seed sample data (optional)**
   ```bash
   node database/seed.js
   ```

6. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Access the dashboard**
   
   Open your browser to: `http://localhost:3000/dashboard`

## Usage

### For Administrators

1. **Dashboard**: Access at `/dashboard` to view:
   - Statistics on upcoming/completed retreats
   - Outstanding invoices
   - Partner performance metrics

2. **Manual Triggers**: Use admin buttons to:
   - Generate monthly reports on-demand
   - Process invoicing for completed retreats
   - Refresh dashboard data

3. **Add Partners**: Insert partner records directly into the database or via API

4. **Track Traffic**: Update `monthly_traffic_reports` table with traffic and leads data

### For Partners

1. **Receive Monthly Reports**: Automated emails on the 10th of each month
2. **Verify Retreats**: Click link in email to access verification form
3. **Submit by Deadline**: Complete verification by the 15th of each month
4. **Receive Invoices**: PayPal invoices sent automatically after net-30 period

### API Endpoints

- `POST /api/bookings` - Report new retreat booking
- `GET /api/verification/:token` - Load verification form
- `POST /api/verification/:token` - Submit verification
- `GET /api/dashboard/stats` - Get dashboard statistics
- `POST /api/admin/trigger-reports` - Manually trigger reports
- `POST /api/admin/trigger-invoicing` - Manually trigger invoicing

## Automated Schedule

The system runs the following automated tasks:

- **Day 10 @ 9:00 AM**: Generate and send monthly reports
- **Day 15 @ 9:00 AM**: Send verification reminders for unsubmitted forms
- **Daily @ 10:00 AM**: Process completed retreats for invoicing
- **Daily @ 2:00 PM**: Check PayPal invoice payment statuses
- **Daily @ 1:00 AM**: Update retreat statuses

## Database Schema

### Tables

- **partners**: Partner information and commission rates
- **monthly_traffic_reports**: Traffic and leads delivered per month
- **retreat_bookings**: Retreat bookings with status tracking
- **invoices**: Commission invoices with PayPal integration
- **verification_forms**: Partner verification form tracking

See `database/schema.sql` for complete schema details.

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration

# Run mock tests
npm run test:mocks
```

### Project Structure

```
├── app.js                  # Main application entry point
├── config/
│   ├── config.js          # Configuration management
│   └── database.js        # Database connection pool
├── database/
│   ├── schema.sql         # Database schema
│   └── seed.js            # Sample data seeding
├── services/
│   ├── reportGenerator.js # Monthly report generation
│   ├── paypalClient.js    # PayPal API integration
│   ├── invoiceService.js  # Invoice management
│   ├── trackingService.js # Retreat tracking
│   └── scheduler.js       # Automated task scheduling
├── routes/
│   ├── api.js             # API endpoints
│   └── verificationForm.js # Verification form routes
├── utils/
│   ├── dateHelpers.js     # Date utility functions
│   └── emailService.js    # Email sending service
├── templates/
│   └── emailTemplates/
│       └── monthlyReport.html # Email template
└── public/
    ├── dashboard.html     # Admin dashboard
    └── verificationForm.html # Partner verification form
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env` file
- Ensure database exists: `psql -l`

### Email Not Sending

- Verify SendGrid API key is valid
- Check SendGrid account status and limits
- Review logs for error messages

### PayPal Integration Issues

- Confirm API credentials are correct
- Check PayPal mode (sandbox vs production)
- Verify merchant email is correct

### Scheduler Not Running

- Check server logs for cron job execution
- Verify system time is correct
- Test manual triggers via dashboard

## Security Considerations

- Store sensitive credentials in `.env` file (never commit to git)
- Use HTTPS in production
- Implement authentication for admin dashboard
- Validate all user inputs
- Use prepared statements for database queries (already implemented)

## License

ISC

## Support

For questions or issues, contact the development team.
