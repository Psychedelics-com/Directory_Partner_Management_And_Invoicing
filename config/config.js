require('dotenv').config();

module.exports = {
  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'partner_retreat_automation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // Server configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  // Email configuration (Gmail API)
  email: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    fromEmail: process.env.FROM_EMAIL || 'reports@psychedelics.com',
    fromName: process.env.FROM_NAME || 'Psychedelics.com Partner Team',
  },

  // Google OAuth (Admin Dashboard)
  googleOAuth: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_OAUTH_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    adminEmail: process.env.ADMIN_EMAIL,
  },

  // PayPal configuration
  paypal: {
    mode: process.env.PAYPAL_MODE || 'sandbox',
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    merchantEmail: process.env.PAYPAL_MERCHANT_EMAIL,
  },

  // Business rules
  business: {
    commissionRate: parseFloat(process.env.COMMISSION_RATE) || 15.0,
    reportDay: parseInt(process.env.REPORT_DAY) || 10,
    deadlineDay: parseInt(process.env.DEADLINE_DAY) || 15,
    netTerms: parseInt(process.env.NET_TERMS) || 30,
  },

  // Application URLs
  urls: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    verificationFormUrl: process.env.VERIFICATION_FORM_URL || 'http://localhost:3000/verification',
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  },
};
