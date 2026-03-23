#!/usr/bin/env node
/**
 * Migration script to move JSON data to Postgres
 * 
 * Usage:
 *   DATABASE_URL="<your-connection-string>" node scripts/migrate_to_postgres.js
 * 
 * Optional env vars:
 *   NEWDATA_PATH (default: data/newdata.json)
 *   TOPUP_HISTORY_PATH (default: data/topup_history.json)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { initDb, query, end } = require('../db/client');
const { ensureWallet, recordTopup, setBalance } = require('../db/base');

const NEWDATA_PATH = process.env.NEWDATA_PATH || 'data/newdata.json';
const TOPUP_HISTORY_PATH = process.env.TOPUP_HISTORY_PATH || 'data/topup_history.json';

function loadJson(filePath) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ File not found: ${fullPath}`);
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
        console.error(`❌ Error reading ${fullPath}:`, err.message);
        return null;
    }
}

async function migrateBalances() {
    const data = loadJson(NEWDATA_PATH);
    if (!data) return 0;

    let count = 0;
    for (const [discordUserId, userData] of Object.entries(data)) {
        try {
            await ensureWallet(discordUserId);

            const balance = parseFloat(userData.balance || 0);
            const totalTopup = parseFloat(userData.total_accumulated_topup || 0);
            const truemoneyTopup = parseFloat(userData.truemoney_topup || 0);

            await query(
                `UPDATE wallets w
         SET balance = $1, total_accumulated_topup = $2, truemoney_topup = $3
         FROM users u
         WHERE w.user_id = u.id AND u.discord_user_id = $4`,
                [balance, totalTopup, truemoneyTopup, String(discordUserId)]
            );

            count++;
            if (count % 100 === 0) {
                console.log(`  Migrated ${count} users...`);
            }
        } catch (err) {
            console.error(`❌ Error migrating user ${discordUserId}:`, err.message);
        }
    }

    return count;
}

async function migrateTopupHistory() {
    const data = loadJson(TOPUP_HISTORY_PATH);
    if (!data) return 0;

    let count = 0;
    for (const [discordUserId, transactions] of Object.entries(data)) {
        if (!Array.isArray(transactions)) continue;

        for (const tx of transactions) {
            try {
                const amount = parseFloat(tx.amount || 0);
                const method = tx.method || 'Unknown';
                const timestamp = tx.timestamp || tx.occurred_at || new Date().toISOString();

                await recordTopup(discordUserId, amount, method, timestamp);
                count++;

                if (count % 500 === 0) {
                    console.log(`  Migrated ${count} transactions...`);
                }
            } catch (err) {
                // Ignore duplicates
                if (!err.message.includes('duplicate')) {
                    console.error(`❌ Error migrating transaction for ${discordUserId}:`, err.message);
                }
            }
        }
    }

    return count;
}

async function main() {
    console.log('🚀 Starting migration to Postgres...\n');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is required');
        process.exit(1);
    }

    const dbOk = await initDb();
    if (!dbOk) {
        console.error('❌ Failed to initialize database');
        process.exit(1);
    }

    console.log('📊 Migrating balances...');
    const balanceCount = await migrateBalances();
    console.log(`✅ Migrated ${balanceCount} user balances\n`);

    console.log('📜 Migrating topup history...');
    const txCount = await migrateTopupHistory();
    console.log(`✅ Migrated ${txCount} topup transactions\n`);

    await end();
    console.log('🎉 Migration complete!');
}

main().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
