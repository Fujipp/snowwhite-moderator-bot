#!/usr/bin/env node
/**
 * Apply RLS (Row Level Security) policies for the database tables
 * 
 * Usage:
 *   DATABASE_URL="<your-connection-string>" node scripts/apply_rls_policies.js
 * 
 * Optional env vars:
 *   RLS_ROLE (default: current_user)
 *   RLS_POLICY_PREFIX (default: bot_all)
 */

require('dotenv').config();
const { query, end } = require('../db/client');

const RLS_ROLE = process.env.RLS_ROLE || null;
const RLS_POLICY_PREFIX = process.env.RLS_POLICY_PREFIX || 'bot_all';

const TABLES = ['projects', 'users', 'wallets', 'topup_transactions'];

async function main() {
    console.log('🔐 Applying RLS policies...\n');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is required');
        process.exit(1);
    }

    try {
        // Get current role if not specified
        let role = RLS_ROLE;
        if (!role) {
            const res = await query('SELECT current_user');
            role = res.rows[0].current_user;
        }
        console.log(`Using role: ${role}\n`);

        for (const table of TABLES) {
            const policyName = `${RLS_POLICY_PREFIX}_${table}`;

            // Enable RLS on table
            await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
            console.log(`✅ Enabled RLS on ${table}`);

            // Drop existing policy if exists
            await query(`DROP POLICY IF EXISTS ${policyName} ON ${table}`);

            // Create permissive policy for the role
            await query(`
        CREATE POLICY ${policyName} ON ${table}
        FOR ALL
        TO ${role}
        USING (true)
        WITH CHECK (true)
      `);
            console.log(`✅ Created policy ${policyName} for role ${role}`);
        }

        console.log('\n🎉 RLS policies applied successfully!');
    } catch (err) {
        console.error('❌ Error applying RLS policies:', err.message);
        process.exit(1);
    } finally {
        await end();
    }
}

main();
