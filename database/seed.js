const { query } = require('../config/database');

/**
 * Seed sample data for testing and development
 */
async function seedDatabase() {
    console.log('Seeding database with sample data...');

    try {
        // Insert sample partners
        console.log('Creating sample partners...');
        await query(`
      INSERT INTO partners (name, email, commission_rate) VALUES
      ('Sacred Valley Retreat', 'contact@sacredvalley.com', 15.00),
      ('Ayahuasca Healing Center', 'info@ayahuascahealing.com', 15.00),
      ('Psilocybin Wellness', 'hello@psilocybinwellness.com', 15.00)
      ON CONFLICT (email) DO NOTHING
    `);

        // Get partner IDs
        const partnersResult = await query('SELECT id, name FROM partners ORDER BY id');
        const partners = partnersResult.rows;

        if (partners.length === 0) {
            console.log('No partners found. Exiting seed.');
            return;
        }

        // Insert sample traffic reports for last month
        console.log('Creating sample traffic reports...');
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;

        for (const partner of partners) {
            await query(`
        INSERT INTO monthly_traffic_reports (partner_id, report_month, traffic_delivered, warm_leads_sent)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (partner_id, report_month) DO NOTHING
      `, [partner.id, lastMonthStr, Math.floor(Math.random() * 1000) + 500, Math.floor(Math.random() * 50) + 10]);
        }

        // Insert sample retreat bookings
        console.log('Creating sample retreat bookings...');

        // Future retreats (scheduled)
        const futureDate1 = new Date();
        futureDate1.setDate(futureDate1.getDate() + 15);
        const futureDate2 = new Date();
        futureDate2.setDate(futureDate2.getDate() + 30);
        const futureDate3 = new Date();
        futureDate3.setDate(futureDate3.getDate() + 45);

        await query(`
      INSERT INTO retreat_bookings (partner_id, guest_name, retreat_date, expected_net_revenue, status)
      VALUES 
      ($1, 'John Smith', $2, 3500.00, 'scheduled'),
      ($3, 'Sarah Johnson', $4, 4200.00, 'scheduled'),
      ($5, 'Michael Chen', $6, 3800.00, 'scheduled')
    `, [
            partners[0].id, futureDate1.toISOString().split('T')[0],
            partners[1].id, futureDate2.toISOString().split('T')[0],
            partners[2].id, futureDate3.toISOString().split('T')[0]
        ]);

        // Past retreats needing verification
        const pastDate1 = new Date();
        pastDate1.setDate(pastDate1.getDate() - 5);
        const pastDate2 = new Date();
        pastDate2.setDate(pastDate2.getDate() - 10);

        await query(`
      INSERT INTO retreat_bookings (partner_id, guest_name, retreat_date, expected_net_revenue, status)
      VALUES 
      ($1, 'Emma Wilson', $2, 3200.00, 'scheduled'),
      ($3, 'David Brown', $4, 4500.00, 'scheduled')
    `, [
            partners[0].id, pastDate1.toISOString().split('T')[0],
            partners[1].id, pastDate2.toISOString().split('T')[0]
        ]);

        // Completed retreats (for invoice testing)
        const completedDate = new Date();
        completedDate.setDate(completedDate.getDate() - 35); // Past net-30 period

        await query(`
      INSERT INTO retreat_bookings (partner_id, guest_name, retreat_date, expected_net_revenue, final_net_revenue, status, verification_date)
      VALUES 
      ($1, 'Lisa Anderson', $2, 3000.00, 3000.00, 'completed', CURRENT_TIMESTAMP)
    `, [partners[2].id, completedDate.toISOString().split('T')[0]]);

        console.log('✓ Database seeded successfully!');
        console.log(`  - ${partners.length} partners created`);
        console.log(`  - ${partners.length} traffic reports created`);
        console.log('  - 6 retreat bookings created');
        console.log('    • 3 upcoming (scheduled)');
        console.log('    • 2 past (needing verification)');
        console.log('    • 1 completed (ready for invoicing)');
        console.log('');
        console.log('You can now:');
        console.log('  1. View dashboard at http://localhost:3000/dashboard');
        console.log('  2. Trigger monthly reports via API or dashboard');
        console.log('  3. Test verification forms');
        console.log('  4. Process invoicing for completed retreat');

    } catch (error) {
        console.error('Error seeding database:', error);
        throw error;
    }
}

// Run seed if called directly
if (require.main === module) {
    seedDatabase()
        .then(() => {
            console.log('Seed complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Seed failed:', error);
            process.exit(1);
        });
}

module.exports = { seedDatabase };
