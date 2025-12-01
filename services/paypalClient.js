const axios = require('axios');
const config = require('../config/config');

/**
 * PayPal API client for invoice management
 */
class PayPalClient {
    constructor() {
        this.baseUrl = config.paypal.mode === 'sandbox'
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get OAuth access token
     * @returns {Promise<string>} - Access token
     */
    async getAccessToken() {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const auth = Buffer.from(
                `${config.paypal.clientId}:${config.paypal.clientSecret}`
            ).toString('base64');

            const response = await axios.post(
                `${this.baseUrl}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry to 5 minutes before actual expiry for safety
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

            return this.accessToken;
        } catch (error) {
            console.error('Error getting PayPal access token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with PayPal');
        }
    }

    /**
     * Create a PayPal invoice
     * @param {Object} invoiceData - Invoice details
     * @returns {Promise<Object>} - Created invoice
     */
    async createInvoice(invoiceData) {
        try {
            const token = await this.getAccessToken();

            const response = await axios.post(
                `${this.baseUrl}/v2/invoicing/invoices`,
                invoiceData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('✓ PayPal invoice created:', response.data.id);
            return response.data;
        } catch (error) {
            console.error('Error creating PayPal invoice:', error.response?.data || error.message);
            throw new Error('Failed to create PayPal invoice');
        }
    }

    /**
     * Send a PayPal invoice
     * @param {string} invoiceId - PayPal invoice ID
     * @returns {Promise<void>}
     */
    async sendInvoice(invoiceId) {
        try {
            const token = await this.getAccessToken();

            await axios.post(
                `${this.baseUrl}/v2/invoicing/invoices/${invoiceId}/send`,
                {
                    send_to_invoicer: false,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('✓ PayPal invoice sent:', invoiceId);
        } catch (error) {
            console.error('Error sending PayPal invoice:', error.response?.data || error.message);
            throw new Error('Failed to send PayPal invoice');
        }
    }

    /**
     * Get invoice details
     * @param {string} invoiceId - PayPal invoice ID
     * @returns {Promise<Object>} - Invoice details
     */
    async getInvoice(invoiceId) {
        try {
            const token = await this.getAccessToken();

            const response = await axios.get(
                `${this.baseUrl}/v2/invoicing/invoices/${invoiceId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error getting PayPal invoice:', error.response?.data || error.message);
            throw new Error('Failed to get PayPal invoice');
        }
    }

    /**
     * Check if invoice is paid
     * @param {string} invoiceId - PayPal invoice ID
     * @returns {Promise<boolean>} - True if paid
     */
    async isInvoicePaid(invoiceId) {
        try {
            const invoice = await this.getInvoice(invoiceId);
            return invoice.status === 'PAID';
        } catch (error) {
            console.error('Error checking invoice payment status:', error);
            return false;
        }
    }

    /**
     * Build invoice data object for PayPal API
     * @param {Object} params - Invoice parameters
     * @returns {Object} - PayPal invoice data
     */
    buildInvoiceData({ partner, booking, amount, dueDate, invoiceNumber }) {
        return {
            detail: {
                invoice_number: `INV-${invoiceNumber}`,
                invoice_date: new Date().toISOString().split('T')[0],
                payment_term: {
                    due_date: dueDate,
                },
                currency_code: 'USD',
                note: `Commission for retreat booking - Guest: ${booking.guest_name}, Date: ${booking.retreat_date}`,
                memo: 'Thank you for your partnership with Psychedelics.com',
            },
            invoicer: {
                name: {
                    given_name: 'Psychedelics.com',
                },
                email_address: config.paypal.merchantEmail,
            },
            primary_recipients: [
                {
                    billing_info: {
                        name: {
                            given_name: partner.name,
                        },
                        email_address: partner.email,
                    },
                },
            ],
            items: [
                {
                    name: 'Commission - Retreat Booking',
                    description: `15% commission for completed retreat\nGuest: ${booking.guest_name}\nRetreat Date: ${booking.retreat_date}\nNet Revenue: $${booking.final_net_revenue.toFixed(2)}`,
                    quantity: '1',
                    unit_amount: {
                        currency_code: 'USD',
                        value: amount.toFixed(2),
                    },
                },
            ],
            configuration: {
                partial_payment: {
                    allow_partial_payment: false,
                },
                allow_tip: false,
                tax_calculated_after_discount: true,
                tax_inclusive: false,
            },
            amount: {
                breakdown: {
                    item_total: {
                        currency_code: 'USD',
                        value: amount.toFixed(2),
                    },
                },
            },
        };
    }

    /**
     * Build consolidated invoice data with multiple line items
     * @param {Object} params - Invoice parameters
     * @returns {Object} - PayPal invoice data
     */
    buildConsolidatedInvoiceData({ partner, lineItems, totalAmount, dueDate, invoiceNumber, billingCycle }) {
        const billingMonth = new Date(billingCycle).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

        // Build items array from line items
        const items = lineItems.map(item => {
            const commissionDesc = item.commission_type === 'flat_rate'
                ? `Flat rate: $${item.flat_rate_amount.toFixed(2)}`
                : `${item.commission_rate}% of $${item.revenue.toFixed(2)}`;

            return {
                name: `Retreat - ${item.guest_name}`,
                description: `Date: ${new Date(item.retreat_date).toLocaleDateString()}\nRevenue: $${item.revenue.toFixed(2)}\nCommission: ${commissionDesc}`,
                quantity: '1',
                unit_amount: {
                    currency_code: 'USD',
                    value: item.line_item_amount.toFixed(2),
                },
            };
        });

        return {
            detail: {
                invoice_number: `INV-${invoiceNumber}`,
                invoice_date: new Date().toISOString().split('T')[0],
                payment_term: {
                    due_date: dueDate,
                },
                currency_code: 'USD',
                note: `Monthly commission invoice for ${billingMonth}\n${lineItems.length} completed retreat${lineItems.length > 1 ? 's' : ''}`,
                memo: 'Thank you for your partnership with Psychedelics.com',
            },
            invoicer: {
                name: {
                    given_name: 'Psychedelics.com',
                },
                email_address: config.paypal.merchantEmail,
            },
            primary_recipients: [
                {
                    billing_info: {
                        name: {
                            given_name: partner.name,
                        },
                        email_address: partner.email,
                    },
                },
            ],
            items,
            configuration: {
                partial_payment: {
                    allow_partial_payment: false,
                },
                allow_tip: false,
                tax_calculated_after_discount: true,
                tax_inclusive: false,
            },
            amount: {
                breakdown: {
                    item_total: {
                        currency_code: 'USD',
                        value: totalAmount.toFixed(2),
                    },
                },
            },
        };
    }
}

module.exports = new PayPalClient();
