// Enhanced Dashboard JavaScript

let currentPartnerId = null;
let allPartners = [];
let allInvoices = [];
let revenueChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
    loadOverviewStats();
    loadRecentActivity();
});

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load tab-specific data
    switch (tabName) {
        case 'overview':
            loadOverviewStats();
            loadRecentActivity();
            break;
        case 'partners':
            loadPartnerStatus();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'financial':
            loadFinancialData();
            break;
        case 'settings':
            loadEmailTemplates();
            loadEmailActivity();
            break;
    }
}

// Notifications
async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications?unread=true');
        const data = await response.json();

        const count = data.counts.unread_count || 0;
        document.getElementById('notification-count').textContent = count;

        if (count === 0) {
            document.getElementById('notification-count').style.display = 'none';
        }

        renderNotifications(data.notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notification-list');

    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="markNotificationRead(${n.id})">
            <div style="font-weight: 600; margin-bottom: 4px;">${n.title}</div>
            <div style="font-size: 13px; color: #7f8c8d;">${n.message}</div>
            <div style="font-size: 11px; color: #95a5a6; margin-top: 4px;">
                ${new Date(n.created_at).toLocaleString()}
            </div>
        </div>
    `).join('');
}

function toggleNotifications() {
    const panel = document.getElementById('notification-panel');
    panel.classList.toggle('open');
}

async function markNotificationRead(id) {
    try {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Overview Tab
async function loadOverviewStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const stats = await response.json();

        const container = document.getElementById('overview-stats');
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total Partners</div>
                <div class="stat-value">${stats.partners?.length || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Upcoming Retreats</div>
                <div class="stat-value">${stats.tracking?.upcoming_count || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Needs Verification</div>
                <div class="stat-value">${stats.tracking?.needs_verification_count || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Outstanding Invoices</div>
                <div class="stat-value">${(stats.invoices?.pending_count || 0) + (stats.invoices?.sent_count || 0)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Revenue</div>
                <div class="stat-value">$${formatCurrency(stats.tracking?.completed_revenue || 0)}</div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading overview stats:', error);
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch('/api/email-activity?limit=10');
        const data = await response.json();

        const container = document.getElementById('recent-activity');

        if (data.activity.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
            return;
        }

        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Partner</th>
                        <th>Template</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.activity.map(a => `
                        <tr>
                            <td>${new Date(a.sent_at).toLocaleString()}</td>
                            <td>${a.partner_name || 'N/A'}</td>
                            <td>${a.template_key || 'Manual'}</td>
                            <td><span class="badge badge-${a.status === 'sent' ? 'success' : 'danger'}">${a.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Partner Status Tab
async function loadPartnerStatus() {
    try {
        const response = await fetch('/api/partners/status-overview');
        const data = await response.json();

        allPartners = data.partners;
        renderPartnerTable(allPartners);
    } catch (error) {
        console.error('Error loading partner status:', error);
    }
}

function renderPartnerTable(partners) {
    const container = document.getElementById('partner-status-table');

    if (partners.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No partners found</p></div>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Partner Name</th>
                    <th>Email</th>
                    <th title="Shows whether the partner has submitted their monthly verification form:

Sent= Form sent, waiting for response.
Submitted = Partner submitted the form.
Overdue = Partner hasn't responded.">Verification Status ℹ️</th>
                    <th title="Number of future retreats scheduled with this partner">Upcoming ℹ️</th>
                    <th title="Number of past retreats that need to be verified by the partner">Needs Verification ℹ️</th>
                    <th title="Number of completed retreats">Completed ℹ️</th>
                    <th title="Total dollar amount of unpaid invoices for this partner">Outstanding ℹ️</th>
                    <th title="Amount of invoices that are past due (more than 72 hours old)">Overdue ℹ️</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${partners.map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td>${p.email}</td>
                        <td>
                            ${p.verification_overdue
            ? '<span class="badge badge-danger">Overdue</span>'
            : p.verification_status === 'submitted'
                ? '<span class="badge badge-success">Submitted</span>'
                : '<span class="badge badge-info">Sent</span>'}
                        </td>
                        <td>${p.upcoming_bookings || 0}</td>
                        <td>${p.needs_verification || 0}</td>
                        <td>${p.completed_bookings || 0}</td>
                        <td>$${formatCurrency(p.total_owed || 0)}</td>
                        <td>
                            ${p.overdue_invoices > 0
            ? `<span class="badge badge-danger">$${formatCurrency(p.overdue_amount || 0)}</span>`
            : '<span class="badge badge-success">None</span>'}
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-small" onclick="viewPartnerDetails(${p.id})">View</button>
                                <button class="btn btn-small btn-secondary" onclick="showPartnerNotes(${p.id})">Notes</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterPartners() {
    const searchTerm = document.getElementById('partner-search').value.toLowerCase();
    const filter = document.getElementById('partner-filter').value;

    let filtered = allPartners.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.email.toLowerCase().includes(searchTerm)
    );

    if (filter !== 'all') {
        filtered = filtered.filter(p => {
            switch (filter) {
                case 'verification_overdue':
                    return p.verification_overdue;
                case 'payment_overdue':
                    return p.overdue_invoices > 0;
                case 'all_paid_up':
                    return (p.outstanding_invoices || 0) === 0;
                case 'needs_verification':
                    return (p.needs_verification || 0) > 0;
                default:
                    return true;
            }
        });
    }

    renderPartnerTable(filtered);
}

// Invoices Tab
async function loadInvoices() {
    try {
        const response = await fetch('/api/invoices/detailed');
        const data = await response.json();

        allInvoices = data.invoices;
        renderInvoiceTable(allInvoices);
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

function renderInvoiceTable(invoices) {
    const container = document.getElementById('invoice-table');

    if (invoices.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No invoices found</p></div>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Invoice #</th>
                    <th>Partner</th>
                    <th>Guest</th>
                    <th>Retreat Date</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Days Overdue</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${invoices.map(i => `
                    <tr>
                        <td>#${i.id}</td>
                        <td>${i.partner_name}</td>
                        <td>${i.guest_name}</td>
                        <td>${formatDate(i.retreat_date)}</td>
                        <td>$${parseFloat(i.amount).toFixed(2)}</td>
                        <td>${formatDate(i.due_date)}</td>
                        <td>
                            <span class="badge badge-${getInvoiceStatusBadge(i.status, i.days_overdue)}">
                                ${i.status}
                            </span>
                        </td>
                        <td>${i.days_overdue > 0 ? i.days_overdue : '-'}</td>
                        <td>
                            ${i.paypal_invoice_id
            ? `<button class="btn btn-small" onclick="window.open('https://www.paypal.com/invoice/p/#${i.paypal_invoice_id}', '_blank')">View PayPal</button>`
            : ''}
                            <button class="btn btn-small btn-secondary" onclick="viewInvoiceDetails(${i.id})">Details</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterInvoices() {
    const searchTerm = document.getElementById('invoice-search').value.toLowerCase();
    const filter = document.getElementById('invoice-filter').value;

    let filtered = allInvoices.filter(i =>
        i.partner_name.toLowerCase().includes(searchTerm) ||
        i.guest_name.toLowerCase().includes(searchTerm)
    );

    if (filter !== 'all') {
        filtered = filtered.filter(i => {
            if (filter === 'overdue') {
                return i.days_overdue > 0;
            }
            return i.status === filter;
        });
    }

    renderInvoiceTable(filtered);
}

function getInvoiceStatusBadge(status, daysOverdue) {
    if (daysOverdue > 0) return 'danger';
    if (status === 'paid') return 'success';
    if (status === 'sent') return 'info';
    return 'warning';
}

// Financial Tab
async function loadFinancialData() {
    try {
        const response = await fetch('/api/financial/summary');
        const data = await response.json();

        renderFinancialStats(data);
        renderRevenueChart(data.monthlyRevenue);
        renderTopPartners(data.topPartners);
    } catch (error) {
        console.error('Error loading financial data:', error);
    }
}

function renderFinancialStats(data) {
    const totalRevenue = data.monthlyRevenue.reduce((sum, m) => sum + parseFloat(m.total_revenue || 0), 0);
    const totalCommission = data.monthlyRevenue.reduce((sum, m) => sum + parseFloat(m.commission_revenue || 0), 0);
    const totalBookings = data.monthlyRevenue.reduce((sum, m) => sum + parseInt(m.booking_count || 0), 0);

    const container = document.getElementById('financial-stats');
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Revenue (12mo)</div>
            <div class="stat-value">$${formatCurrency(totalRevenue)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Commission (12mo)</div>
            <div class="stat-value">$${formatCurrency(totalCommission)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Bookings (12mo)</div>
            <div class="stat-value">${totalBookings}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Revenue/Booking</div>
            <div class="stat-value">$${formatCurrency(totalBookings > 0 ? totalRevenue / totalBookings : 0)}</div>
        </div>
    `;
}

function renderRevenueChart(monthlyData) {
    const ctx = document.getElementById('revenue-chart');

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.map(m => m.month),
            datasets: [{
                label: 'Total Revenue',
                data: monthlyData.map(m => parseFloat(m.total_revenue || 0)),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }, {
                label: 'Commission Revenue',
                data: monthlyData.map(m => parseFloat(m.commission_revenue || 0)),
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function renderTopPartners(partners) {
    const container = document.getElementById('top-partners-table');

    if (partners.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No data available</p></div>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Partner</th>
                    <th>Bookings</th>
                    <th>Total Revenue</th>
                    <th>Commission Earned</th>
                </tr>
            </thead>
            <tbody>
                ${partners.map(p => `
                    <tr>
                        <td>${p.partner_name}</td>
                        <td>${p.booking_count}</td>
                        <td>$${formatCurrency(p.total_revenue || 0)}</td>
                        <td>$${formatCurrency(p.commission_earned || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Settings Tab
async function loadEmailTemplates() {
    try {
        const response = await fetch('/api/email-templates');
        const data = await response.json();

        const container = document.getElementById('email-templates');
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Template Name</th>
                        <th>Subject</th>
                        <th>Send Timing</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.templates.map(t => `
                        <tr>
                            <td>${t.name}</td>
                            <td>${t.subject}</td>
                            <td>${t.send_timing_days} days</td>
                            <td>
                                <span class="badge badge-${t.is_active ? 'success' : 'secondary'}">
                                    ${t.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-small" onclick="editTemplate('${t.template_key}')">Edit</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading email templates:', error);
    }
}

async function loadEmailActivity() {
    try {
        const response = await fetch('/api/email-activity?limit=50');
        const data = await response.json();

        const container = document.getElementById('email-activity');
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Partner</th>
                        <th>Subject</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.activity.map(a => `
                        <tr>
                            <td>${new Date(a.sent_at).toLocaleString()}</td>
                            <td>${a.partner_name || 'N/A'}</td>
                            <td>${a.subject || 'N/A'}</td>
                            <td>
                                <span class="badge badge-${a.status === 'sent' ? 'success' : 'danger'}">
                                    ${a.status}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading email activity:', error);
    }
}

// Modals
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showAddPartner() {
    showModal('add-partner-modal');
}

function showUploadCSV() {
    showModal('upload-csv-modal');
}

async function showPartnerNotes(partnerId) {
    currentPartnerId = partnerId;
    showModal('partner-notes-modal');

    try {
        const response = await fetch(`/api/partners/${partnerId}/notes`);
        const data = await response.json();

        const container = document.getElementById('notes-list');
        if (data.notes.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No notes yet</p></div>';
        } else {
            container.innerHTML = data.notes.map(n => `
                <div style="padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px;">
                    <div style="font-size: 14px; margin-bottom: 4px;">${n.note}</div>
                    <div style="font-size: 11px; color: #95a5a6;">
                        ${n.created_by} - ${new Date(n.created_at).toLocaleString()}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Form Submissions
async function addPartner(event) {
    event.preventDefault();

    const data = {
        name: document.getElementById('partner-name').value,
        email: document.getElementById('partner-email').value,
        contact_info: document.getElementById('partner-contact').value,
        commission_type: document.getElementById('partner-commission-type').value,
        commission_rate: parseFloat(document.getElementById('partner-commission').value),
        flat_rate_amount: parseFloat(document.getElementById('partner-flat-rate').value)
    };

    try {
        const response = await fetch('/api/admin/partners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Partner added successfully!');
            closeModal('add-partner-modal');
            loadPartnerStatus();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error adding partner:', error);
        alert('Failed to add partner');
    }
}

async function uploadCSV(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('csvFile', document.getElementById('csv-file').files[0]);
    formData.append('reportMonth', document.getElementById('csv-month').value);

    try {
        const response = await fetch('/api/admin/traffic/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert(`CSV uploaded successfully!\n${result.message}\nSuccess: ${result.results.success}, Failed: ${result.results.failed}`);
            closeModal('upload-csv-modal');
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error uploading CSV:', error);
        alert('Failed to upload CSV');
    }
}

async function addNote(event) {
    event.preventDefault();

    const note = document.getElementById('note-text').value;

    try {
        const response = await fetch(`/api/partners/${currentPartnerId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note })
        });

        if (response.ok) {
            document.getElementById('note-text').value = '';
            showPartnerNotes(currentPartnerId);
        } else {
            alert('Failed to add note');
        }
    } catch (error) {
        console.error('Error adding note:', error);
    }
}

// Admin Actions
async function triggerReports() {
    if (!confirm('Generate monthly reports for all partners?')) return;

    try {
        const response = await fetch('/api/admin/trigger-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const result = await response.json();
        alert(`Reports generated: ${result.results.successCount} sent, ${result.results.failureCount} failed`);
    } catch (error) {
        console.error('Error triggering reports:', error);
        alert('Failed to generate reports');
    }
}

async function triggerInvoicing() {
    if (!confirm('Process invoicing for completed retreats?')) return;

    try {
        const response = await fetch('/api/admin/trigger-invoicing', { method: 'POST' });
        const result = await response.json();
        alert(`Invoicing complete: ${result.results.successCount} invoices created`);
        loadInvoices();
    } catch (error) {
        console.error('Error triggering invoicing:', error);
        alert('Failed to process invoicing');
    }
}

// Export Data
function exportData() {
    const tab = document.querySelector('.tab.active').textContent.toLowerCase();

    let data, filename;

    switch (tab) {
        case 'partner status':
            data = allPartners;
            filename = 'partners.csv';
            break;
        case 'invoices':
            data = allInvoices;
            filename = 'invoices.csv';
            break;
        default:
            alert('Export not available for this tab');
            return;
    }

    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    const csv = convertToCSV(data);
    downloadCSV(csv, filename);
}

function convertToCSV(data) {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(','));
    return [headers, ...rows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Utility Functions
function formatCurrency(value) {
    return parseFloat(value || 0).toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function viewPartnerDetails(partnerId) {
    showModal('partner-details-modal');
    const container = document.getElementById('partner-details-content');
    container.innerHTML = '<div class="loading">Loading partner details...</div>';

    Promise.all([
        fetch(`/api/admin/partners`).then(r => r.json()),
        fetch(`/api/admin/bookings?partner_id=${partnerId}`).then(r => r.json()),
        fetch(`/api/admin/invoices?partner_id=${partnerId}`).then(r => r.json())
    ])
        .then(([partnersData, bookingsData, invoicesData]) => {
            const partner = partnersData.partners.find(p => p.id === partnerId);

            if (!partner) {
                container.innerHTML = '<div class="error">Partner not found</div>';
                return;
            }

            const bookings = bookingsData.bookings || [];
            const invoices = invoicesData.invoices || [];

            container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #2c3e50;">Partner Information</h3>
                    <button class="btn btn-small" onclick="editPartnerFromDetails(${partnerId})" style="background: #667eea; color: white;">Edit Partner</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <div><strong>Name:</strong> ${partner.name}</div>
                    <div><strong>Email:</strong> ${partner.email}</div>
                    <div><strong>Commission Rate:</strong> ${partner.commission_rate || 15}%</div>
                    <div><strong>Commission Type:</strong> ${partner.commission_type || 'percentage'}</div>
                    ${partner.flat_rate_amount ? `<div><strong>Flat Rate:</strong> $${partner.flat_rate_amount}</div>` : ''}
                    <div><strong>Contact Info:</strong> ${partner.contact_info || 'N/A'}</div>
                </div>
            </div>

            <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #2c3e50;">Bookings (${bookings.length})</h3>
                    <button class="btn btn-small" onclick="showAddBookingModal(${partnerId})" style="background: #27ae60; color: white;">+ Add Booking</button>
                </div>
                ${bookings.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Guest Name</th>
                                <th>Retreat Date</th>
                                <th>Status</th>
                                <th>Revenue</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.map(b => `
                                <tr>
                                    <td>${b.guest_name}</td>
                                    <td>${formatDate(b.retreat_date)}</td>
                                    <td><span class="badge badge-${getStatusBadge(b.status)}">${b.status}</span></td>
                                    <td>$${formatCurrency(b.final_net_revenue || b.expected_net_revenue || 0)}</td>
                                    <td>
                                        <button class="btn btn-small" onclick="editBooking(${b.id}, ${partnerId})">Edit</button>
                                        <button class="btn btn-small" style="background: #e74c3c; color: white;" onclick="deleteBooking(${b.id}, ${partnerId})">Delete</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="color: #7f8c8d;">No bookings found</p>'}
            </div>

            <div>
                <h3 style="margin-bottom: 15px; color: #2c3e50;">Invoices (${invoices.length})</h3>
                ${invoices.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoices.map(i => `
                                <tr>
                                    <td>#${i.id}</td>
                                    <td>${formatDate(i.created_at)}</td>
                                    <td>${formatDate(i.due_date)}</td>
                                    <td>$${formatCurrency(i.amount)}</td>
                                    <td><span class="badge badge-${getInvoiceStatusBadge(i.status, i.days_overdue)}">${i.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p style="color: #7f8c8d;">No invoices found</p>'}
            </div>
        `;
        })
        .catch(error => {
            console.error('Error loading partner details:', error);
            container.innerHTML = '<div class="error">Failed to load partner details</div>';
        });
}

function getStatusBadge(status) {
    const badges = {
        'scheduled': 'info',
        'completed': 'success',
        'canceled': 'danger',
        'rescheduled': 'warning'
    };
    return badges[status] || 'secondary';
}

async function editPartnerFromDetails(partnerId) {
    // Close the partner details modal first
    closeModal('partner-details-modal');

    // Open the edit modal with partner data
    await editPartner(partnerId);
}

// Override the updatePartner function to handle both cases
const originalUpdatePartner = updatePartner;
async function updatePartner(event) {
    event.preventDefault();

    const partnerId = document.getElementById('edit-partner-id').value;
    const data = {
        name: document.getElementById('edit-partner-name').value,
        email: document.getElementById('edit-partner-email').value,
        contact_info: document.getElementById('edit-partner-contact').value,
        commission_type: document.getElementById('edit-partner-commission-type').value,
        commission_rate: parseFloat(document.getElementById('edit-partner-commission').value),
        flat_rate_amount: parseFloat(document.getElementById('edit-partner-flat-rate').value) || null
    };

    try {
        const response = await fetch(`/api/admin/partners/${partnerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Partner updated successfully!');
            closeModal('edit-partner-modal');

            // Refresh both the partner list and reopen partner details
            await loadPartnerStatus();
            viewPartnerDetails(partnerId);
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating partner:', error);
        alert('Failed to update partner');
    }
}

function editTemplate(templateKey) {
    alert(`Edit template: ${templateKey} (to be implemented)`);
}

function toggleCommissionFields() {
    const type = document.getElementById('partner-commission-type').value;
    const rateGroup = document.getElementById('commission-rate-group');
    const flatGroup = document.getElementById('flat-rate-group');

    if (type === 'percentage') {
        rateGroup.style.display = 'block';
        flatGroup.style.display = 'none';
    } else {
        rateGroup.style.display = 'none';
        flatGroup.style.display = 'block';
    }
}

function toggleEditCommissionFields() {
    const type = document.getElementById('edit-partner-commission-type').value;
    const rateGroup = document.getElementById('edit-commission-rate-group');
    const flatGroup = document.getElementById('edit-flat-rate-group');

    if (type === 'percentage') {
        rateGroup.style.display = 'block';
        flatGroup.style.display = 'none';
    } else {
        rateGroup.style.display = 'none';
        flatGroup.style.display = 'block';
    }
}

async function editPartner(partnerId) {
    showModal('edit-partner-modal');

    try {
        // Fetch partner details
        const response = await fetch(`/api/admin/partners`);
        const data = await response.json();
        const partner = data.partners.find(p => p.id === partnerId);

        if (!partner) {
            alert('Partner not found');
            return;
        }

        // Populate form
        document.getElementById('edit-partner-id').value = partner.id;
        document.getElementById('edit-partner-name').value = partner.name;
        document.getElementById('edit-partner-email').value = partner.email;
        document.getElementById('edit-partner-contact').value = partner.contact_info || '';
        document.getElementById('edit-partner-commission-type').value = partner.commission_type || 'percentage';
        document.getElementById('edit-partner-commission').value = partner.commission_rate || 15;
        document.getElementById('edit-partner-flat-rate').value = partner.flat_rate_amount || '';

        // Toggle commission fields based on type
        toggleEditCommissionFields();
    } catch (error) {
        console.error('Error loading partner:', error);
        alert('Failed to load partner details');
    }
}

async function updatePartner(event) {
    event.preventDefault();

    const partnerId = document.getElementById('edit-partner-id').value;
    const data = {
        name: document.getElementById('edit-partner-name').value,
        email: document.getElementById('edit-partner-email').value,
        contact_info: document.getElementById('edit-partner-contact').value,
        commission_type: document.getElementById('edit-partner-commission-type').value,
        commission_rate: parseFloat(document.getElementById('edit-partner-commission').value),
        flat_rate_amount: parseFloat(document.getElementById('edit-partner-flat-rate').value) || null
    };

    try {
        const response = await fetch(`/api/admin/partners/${partnerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Partner updated successfully!');
            closeModal('edit-partner-modal');
            loadPartnerStatus();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error updating partner:', error);
        alert('Failed to update partner');
    }
}

async function viewInvoiceDetails(invoiceId) {
    showModal('invoice-details-modal');
    const container = document.getElementById('invoice-details-content');
    container.innerHTML = '<div class="loading">Loading details...</div>';

    try {
        // Since we don't have a specific endpoint for line items yet, we'll use the invoice data we already have
        // In a real implementation, you'd fetch /api/invoices/:id/line-items
        // For now, let's mock it or display what we know

        // Actually, let's fetch the specific invoice from our local list first
        const invoice = allInvoices.find(i => i.id === invoiceId);

        if (!invoice) {
            container.innerHTML = '<div class="error">Invoice not found</div>';
            return;
        }

        // Fetch line items (assuming we add this endpoint or include it in the list)
        // For now, let's display the invoice summary
        container.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong>Partner:</strong> ${invoice.partner_name}</div>
                    <div><strong>Invoice #:</strong> ${invoice.id}</div>
                    <div><strong>Date:</strong> ${formatDate(invoice.created_at)}</div>
                    <div><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</div>
                    <div><strong>Status:</strong> <span class="badge badge-${getInvoiceStatusBadge(invoice.status, invoice.days_overdue)}">${invoice.status}</span></div>
                    <div><strong>Total Amount:</strong> $${parseFloat(invoice.amount).toFixed(2)}</div>
                </div>
            </div>
            
            <h3>Line Items</h3>
            <table style="margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Guest</th>
                        <th>Retreat Date</th>
                        <th>Revenue</th>
                        <th>Commission Type</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Mocking line items since we don't have the endpoint yet -->
                    <tr>
                        <td>${invoice.guest_name || 'Consolidated Items'}</td>
                        <td>${formatDate(invoice.retreat_date)}</td>
                        <td>$${parseFloat(invoice.amount / 0.15).toFixed(2)} (Est)</td>
                        <td>Percentage</td>
                        <td>$${parseFloat(invoice.amount).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error viewing invoice details:', error);
        container.innerHTML = '<div class="error">Failed to load details</div>';
    }
}

// Booking Management Functions
function showAddBookingModal(partnerId) {
    document.getElementById('booking-modal-title').textContent = 'Add Booking';
    document.getElementById('booking-id').value = '';
    document.getElementById('booking-partner-id').value = partnerId;
    document.getElementById('booking-guest-name').value = '';
    document.getElementById('booking-retreat-date').value = '';
    document.getElementById('booking-status').value = 'scheduled';
    document.getElementById('booking-expected-revenue').value = '';
    document.getElementById('booking-final-revenue').value = '';
    showModal('booking-modal');
}

async function editBooking(bookingId, partnerId) {
    try {
        const response = await fetch(`/api/admin/bookings?partner_id=${partnerId}`);
        const data = await response.json();
        const booking = data.bookings.find(b => b.id === bookingId);

        if (!booking) {
            alert('Booking not found');
            return;
        }

        document.getElementById('booking-modal-title').textContent = 'Edit Booking';
        document.getElementById('booking-id').value = booking.id;
        document.getElementById('booking-partner-id').value = partnerId;
        document.getElementById('booking-guest-name').value = booking.guest_name;
        document.getElementById('booking-retreat-date').value = booking.retreat_date.split('T')[0];
        document.getElementById('booking-status').value = booking.status;
        document.getElementById('booking-expected-revenue').value = booking.expected_net_revenue || '';
        document.getElementById('booking-final-revenue').value = booking.final_net_revenue || '';
        showModal('booking-modal');
    } catch (error) {
        console.error('Error loading booking:', error);
        alert('Failed to load booking details');
    }
}

async function deleteBooking(bookingId, partnerId) {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Booking deleted successfully!');
            closeModal('booking-modal');
            viewPartnerDetails(partnerId);
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Failed to delete booking');
    }
}

async function saveBooking(event) {
    event.preventDefault();

    const bookingId = document.getElementById('booking-id').value;
    const partnerId = document.getElementById('booking-partner-id').value;
    const data = {
        partner_id: parseInt(partnerId),
        guest_name: document.getElementById('booking-guest-name').value,
        retreat_date: document.getElementById('booking-retreat-date').value,
        status: document.getElementById('booking-status').value,
        expected_net_revenue: parseFloat(document.getElementById('booking-expected-revenue').value) || null,
        final_net_revenue: parseFloat(document.getElementById('booking-final-revenue').value) || null
    };

    try {
        const url = bookingId ? `/api/admin/bookings/${bookingId}` : '/api/admin/bookings';
        const method = bookingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert(bookingId ? 'Booking updated successfully!' : 'Booking created successfully!');
            closeModal('booking-modal');
            viewPartnerDetails(partnerId);
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error saving booking:', error);
        alert('Failed to save booking');
    }
}
