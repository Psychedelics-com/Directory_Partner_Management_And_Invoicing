/**
 * Date helper utilities for the partner automation system
 */

/**
 * Check if a date has passed (is in the past)
 * @param {Date|string} date - Date to check
 * @returns {boolean} - True if date has passed
 */
function hasDatePassed(date) {
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate < today;
}

/**
 * Calculate net-30 due date from a given date
 * @param {Date|string} startDate - Starting date
 * @returns {Date} - Due date (30 days later)
 */
function calculateNet30DueDate(startDate) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 30);
    return date;
}

/**
 * Calculate invoice due date (72 hours from now)
 * Invoices are only created for retreats 30+ days old, and payment is due in 72 hours
 * 
 * @returns {Date} - Due date (72 hours from now)
 */
function calculateInvoiceDueDate() {
    const date = new Date();
    date.setHours(date.getHours() + 72);
    return date;
}

/**
 * Check if today is the specified day of the month
 * @param {number} dayOfMonth - Day to check (1-31)
 * @returns {boolean} - True if today is that day
 */
function isTodayDayOfMonth(dayOfMonth) {
    const today = new Date();
    return today.getDate() === dayOfMonth;
}

/**
 * Get the current month in YYYY-MM format
 * @returns {string} - Current month string
 */
function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get the previous month in YYYY-MM format
 * @returns {string} - Previous month string
 */
function getPreviousMonth() {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Format date for display (e.g., "January 15, 2024")
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDateForDisplay(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format date for database (YYYY-MM-DD)
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDateForDB(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get the first day of a given month
 * @param {string} monthString - Month in YYYY-MM format
 * @returns {Date} - First day of the month
 */
function getFirstDayOfMonth(monthString) {
    return new Date(`${monthString}-01`);
}

/**
 * Get the last day of a given month
 * @param {string} monthString - Month in YYYY-MM format
 * @returns {Date} - Last day of the month
 */
function getLastDayOfMonth(monthString) {
    const [year, month] = monthString.split('-').map(Number);
    return new Date(year, month, 0);
}

/**
 * Check if a retreat's net-30 period has expired
 * @param {Date|string} retreatDate - Date of the retreat
 * @param {number} netTerms - Number of days for net terms (default 30)
 * @returns {boolean} - True if net-30 period has expired
 */
function isNet30Expired(retreatDate, netTerms = 30) {
    const dueDate = calculateNet30DueDate(retreatDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return today >= dueDate;
}

/**
 * Get days until a specific date
 * @param {Date|string} targetDate - Target date
 * @returns {number} - Number of days (negative if in past)
 */
function getDaysUntil(targetDate) {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

module.exports = {
    hasDatePassed,
    calculateNet30DueDate,
    calculateInvoiceDueDate,
    isTodayDayOfMonth,
    getCurrentMonth,
    getPreviousMonth,
    formatDateForDisplay,
    formatDateForDB,
    getFirstDayOfMonth,
    getLastDayOfMonth,
    isNet30Expired,
    getDaysUntil,
};
