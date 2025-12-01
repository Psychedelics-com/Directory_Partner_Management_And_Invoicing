# Deployment Guide - Partner Retreat Automation System

## Quick Start Deployment (Supabase + Railway)

This guide walks you through deploying the Partner Automation System using managed services.

---

## Prerequisites

- GitHub account
- Google Workspace account
- PayPal Business account
- Credit card (for Railway, though free tier available)

---

## Step 1: Set Up Database (Supabase)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name**: `partner-automation`
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to you
5. Click "Create new project" (takes ~2 minutes)

### 1.2 Run Database Schema

1. In Supabase dashboard, click "SQL Editor"
2. Click "New Query"
3. Copy contents of `database/schema.sql`
4. Paste and click "Run"
5. Verify tables created (should see 5 tables)

### 1.3 Get Connection String

1. Click "Project Settings" (gear icon)
2. Click "Database"
3. Scroll to "Connection string"
4. Copy "URI" format connection string
5. Save for later (format: `postgresql://postgres:[password]@[host]:5432/postgres`)

---

## Step 2: Set Up Google APIs

### 2.1 Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: `partner-automation`
4. Click "Create"

### 2.2 Enable Gmail API

1. In left menu, click "APIs & Services" → "Library"
2. Search "Gmail API"
3. Click "Enable"

### 2.3 Create OAuth Credentials (for Gmail API)

1. Click "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure consent screen:
   - User Type: Internal
   - App name: Partner Automation
   - Support email: your email
   - Save and continue through all steps
4. Application type: "Web application"
5. Name: "Gmail API Client"
6. Authorized redirect URIs: `https://developers.google.com/oauthplayground`
7. Click "Create"
8. **Save Client ID and Client Secret**

### 2.4 Get Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click gear icon (top right) → "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In left panel, scroll to "Gmail API v1"
5. Select `https://www.googleapis.com/auth/gmail.send`
6. Click "Authorize APIs"
7. Sign in with your Google Workspace account
8. Click "Exchange authorization code for tokens"
9. **Save the Refresh Token**

### 2.5 Create OAuth Credentials (for Admin Dashboard)

1. Back in Google Cloud Console → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Admin Dashboard"
5. Authorized redirect URIs: 
   - `http://localhost:3000/auth/google/callback` (for testing)
   - `https://your-app-name.up.railway.app/auth/google/callback` (add after deployment)
6. Click "Create"
7. **Save Client ID and Client Secret** (different from Gmail API)

---

## Step 3: Set Up PayPal

### 3.1 Create PayPal App

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Log in with PayPal Business account
3. Click "Apps & Credentials"
4. Select "Sandbox" tab (for testing)
5. Click "Create App"
6. App Name: "Partner Automation"
7. Click "Create App"
8. **Save Client ID and Secret**

### 3.2 Test in Sandbox

- Use sandbox credentials initially
- Switch to "Live" tab when ready for production

---

## Step 4: Deploy to Railway

### 4.1 Push Code to GitHub

```bash
cd /path/to/cobalt-protostar
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/partner-automation.git
git push -u origin main
```

### 4.2 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up / Log in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your repository
6. Click "Deploy"

### 4.3 Configure Environment Variables

1. In Railway dashboard, click your project
2. Click "Variables" tab
3. Add all variables from `.env.example`:

```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Gmail API (from Google Cloud)
GOOGLE_CLIENT_ID=your_gmail_client_id
GOOGLE_CLIENT_SECRET=your_gmail_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
FROM_EMAIL=reports@psychedelics.com
FROM_NAME=Psychedelics.com Partner Team

# Google OAuth (from Google Cloud - Admin Dashboard)
GOOGLE_OAUTH_CLIENT_ID=your_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_OAUTH_CALLBACK_URL=https://your-app.up.railway.app/auth/google/callback
ADMIN_EMAIL=your-admin@psychedelics.com

# PayPal (from PayPal Developer)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MERCHANT_EMAIL=merchant@psychedelics.com

# Application
PORT=3000
NODE_ENV=production
BASE_URL=https://your-app.up.railway.app
VERIFICATION_FORM_URL=https://your-app.up.railway.app/verification

# Security
SESSION_SECRET=generate_random_32_character_string_here
```

4. Click "Deploy" to restart with new variables

### 4.4 Get Your Railway URL

1. In Railway dashboard, click "Settings"
2. Under "Domains", click "Generate Domain"
3. Copy the URL (e.g., `your-app.up.railway.app`)
4. Update environment variables:
   - `GOOGLE_OAUTH_CALLBACK_URL`
   - `BASE_URL`
   - `VERIFICATION_FORM_URL`

### 4.5 Update Google OAuth Redirect URI

1. Go back to Google Cloud Console
2. Click "Credentials"
3. Edit "Admin Dashboard" OAuth client
4. Add authorized redirect URI: `https://your-app.up.railway.app/auth/google/callback`
5. Save

---

## Step 5: Verify Deployment

### 5.1 Test Application

1. Visit `https://your-app.up.railway.app`
2. Should redirect to `/login`
3. Click "Sign in with Google"
4. Authorize with your admin email
5. Should redirect to dashboard

### 5.2 Seed Sample Data

Option 1: Via Railway CLI
```bash
railway run node database/seed.js
```

Option 2: Via SQL Editor in Supabase
- Copy contents of `database/seed.js`
- Manually insert sample data

### 5.3 Test Email Sending

1. In dashboard, click "Generate Monthly Reports"
2. Check Gmail "Sent" folder
3. Verify email received

### 5.4 Test PayPal Integration

1. Ensure `PAYPAL_MODE=sandbox`
2. In dashboard, click "Process Invoicing"
3. Check PayPal sandbox for created invoices

---

## Step 6: Production Checklist

Before going live:

- [ ] Switch PayPal to production mode
  - Update `PAYPAL_MODE=live`
  - Use production Client ID and Secret
- [ ] Configure custom domain (optional)
  - Add CNAME record in DNS
  - Configure in Railway settings
- [ ] Set up monitoring
  - Railway provides basic metrics
  - Consider adding Sentry for error tracking
- [ ] Configure backups
  - Supabase provides automatic backups
  - Verify backup retention settings
- [ ] Test complete workflow end-to-end
  - Add real partner
  - Upload traffic CSV
  - Generate report
  - Submit verification form
  - Verify invoice creation
- [ ] Document admin procedures
  - Monthly CSV upload process
  - Partner enrollment process
  - Invoice review process

---

## Ongoing Maintenance

### Monthly Tasks

1. Export partner metrics from WordPress
2. Upload CSV to dashboard
3. Verify reports sent successfully
4. Monitor verification submission rates
5. Review invoices and payments

### Monitoring

Check Railway dashboard for:
- Application uptime
- Memory usage
- Error logs

Check Supabase dashboard for:
- Database size
- Query performance
- Backup status

---

## Troubleshooting

### Application Won't Start

1. Check Railway logs for errors
2. Verify all environment variables set
3. Check database connection string

### Emails Not Sending

1. Verify Gmail API credentials
2. Check refresh token is valid
3. Verify FROM_EMAIL matches Google Workspace account
4. Check Gmail API quota (2000/day)

### PayPal Invoices Failing

1. Verify PayPal credentials
2. Check PAYPAL_MODE setting
3. Review PayPal API logs
4. Ensure merchant email is correct

### Authentication Not Working

1. Verify Google OAuth credentials
2. Check callback URL matches exactly
3. Ensure admin email is set correctly
4. Clear browser cookies and try again

---

## Cost Breakdown

### Monthly Costs

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Free (500MB) | $0 |
| Supabase | Pro (8GB) | $25 |
| Railway | Hobby | $5 |
| Railway | Starter | $20 |
| **Total (Minimum)** | | **$5/mo** |
| **Total (Recommended)** | | **$25-45/mo** |

### Free Tier Limits

- **Supabase Free**: 500MB storage, 2GB bandwidth
- **Railway Free**: 500 hours/month, $5 credit
- **Gmail API**: 2,000 emails/day (free)
- **PayPal API**: Free for invoicing

---

## Alternative: Self-Hosted VPS

If you prefer full control:

### DigitalOcean Droplet ($12/mo)

```bash
# Create droplet (Ubuntu 22.04, 2GB RAM)
# SSH into server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Clone repository
git clone https://github.com/yourusername/partner-automation.git
cd partner-automation

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env  # Edit with your credentials

# Set up database
sudo -u postgres psql -f database/schema.sql

# Install PM2 for process management
sudo npm install -g pm2
pm2 start app.js
pm2 startup
pm2 save

# Set up Nginx reverse proxy
sudo apt install nginx
# Configure Nginx for your domain
# Set up SSL with Let's Encrypt
```

---

## Support

For deployment issues:
- Railway: [railway.app/help](https://railway.app/help)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Google Cloud: [cloud.google.com/support](https://cloud.google.com/support)
- PayPal: [developer.paypal.com/support](https://developer.paypal.com/support)

---

**Last Updated**: November 2025  
**Version**: 1.0
