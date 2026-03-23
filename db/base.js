const { query } = require('./client');

const PROJECT_ID = process.env.PROJECT_ID || 'discord-bot-topup';
const PROJECT_NAME = process.env.PROJECT_NAME || PROJECT_ID;

// ===== Helpers =====

async function ensureProject() {
    await query(
        `INSERT INTO projects (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [PROJECT_ID, PROJECT_NAME]
    );
}

async function ensureUser(discordUserId) {
    await query(
        `INSERT INTO users (discord_user_id) VALUES ($1) ON CONFLICT (discord_user_id) DO NOTHING`,
        [String(discordUserId)]
    );
    const res = await query(
        `SELECT id FROM users WHERE discord_user_id = $1`,
        [String(discordUserId)]
    );
    return res.rows[0]?.id;
}

async function ensureWallet(discordUserId) {
    await ensureProject();
    const userId = await ensureUser(discordUserId);
    await query(
        `INSERT INTO wallets (user_id, project_id) VALUES ($1, $2) ON CONFLICT (user_id, project_id) DO NOTHING`,
        [userId, PROJECT_ID]
    );
    const res = await query(
        `SELECT * FROM wallets WHERE user_id = $1 AND project_id = $2`,
        [userId, PROJECT_ID]
    );
    return res.rows[0];
}

async function getWalletByDiscordId(discordUserId) {
    const res = await query(
        `SELECT w.* FROM wallets w
     JOIN users u ON w.user_id = u.id
     WHERE u.discord_user_id = $1 AND w.project_id = $2`,
        [String(discordUserId), PROJECT_ID]
    );
    return res.rows[0] || null;
}

// ===== Balance Functions =====

async function getBalance(discordUserId) {
    const wallet = await getWalletByDiscordId(discordUserId);
    return wallet ? parseFloat(wallet.balance) : 0;
}

async function setBalance(discordUserId, amount) {
    const wallet = await ensureWallet(discordUserId);
    await query(
        `UPDATE wallets SET balance = $1 WHERE id = $2`,
        [amount, wallet.id]
    );
    return amount;
}

async function addBalance(discordUserId, amount) {
    const wallet = await ensureWallet(discordUserId);
    const res = await query(
        `UPDATE wallets SET balance = balance + $1, total_accumulated_topup = total_accumulated_topup + $1
     WHERE id = $2 RETURNING balance`,
        [amount, wallet.id]
    );
    return parseFloat(res.rows[0].balance);
}

async function removeBalance(discordUserId) {
    const wallet = await getWalletByDiscordId(discordUserId);
    if (!wallet) return false;

    await query(`DELETE FROM topup_transactions WHERE wallet_id = $1`, [wallet.id]);
    await query(`DELETE FROM wallets WHERE id = $1`, [wallet.id]);
    return true;
}

// ===== Topup History Functions =====

async function recordTopup(discordUserId, amount, method = 'Unknown', timestamp = null) {
    const wallet = await ensureWallet(discordUserId);
    const occurredAt = timestamp ? new Date(timestamp) : new Date();

    const res = await query(
        `INSERT INTO topup_transactions (wallet_id, amount, method, occurred_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (wallet_id, occurred_at, amount, method) DO NOTHING
     RETURNING *`,
        [wallet.id, amount, method, occurredAt]
    );

    const row = res.rows[0];
    return row ? {
        amount: parseFloat(row.amount),
        method: row.method,
        timestamp: row.occurred_at.toISOString()
    } : null;
}

async function getTopupHistory(discordUserId, limit = 10) {
    const wallet = await getWalletByDiscordId(discordUserId);
    if (!wallet) return { history: [], count: 0, totalAmount: 0 };

    const histRes = await query(
        `SELECT * FROM topup_transactions WHERE wallet_id = $1
     ORDER BY occurred_at DESC LIMIT $2`,
        [wallet.id, limit]
    );

    const countRes = await query(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
     FROM topup_transactions WHERE wallet_id = $1`,
        [wallet.id]
    );

    const history = histRes.rows.map(r => ({
        id: r.id,
        amount: parseFloat(r.amount),
        method: r.method,
        timestamp: r.occurred_at.toISOString()
    }));

    return {
        history,
        count: parseInt(countRes.rows[0].cnt),
        totalAmount: parseFloat(countRes.rows[0].total)
    };
}

async function updateTopupHistory(discordUserId, index, amount, method = null, timestamp = null) {
    const wallet = await getWalletByDiscordId(discordUserId);
    if (!wallet) return null;

    // Get entry by index (1-based, newest first)
    const listRes = await query(
        `SELECT * FROM topup_transactions WHERE wallet_id = $1
     ORDER BY occurred_at DESC LIMIT $2`,
        [wallet.id, index]
    );

    if (listRes.rows.length < index) return null;
    const entry = listRes.rows[index - 1];

    const before = {
        amount: parseFloat(entry.amount),
        method: entry.method,
        timestamp: entry.occurred_at.toISOString()
    };

    const newMethod = method !== null ? method : entry.method;
    const newOccurredAt = timestamp ? new Date(timestamp) : entry.occurred_at;

    await query(
        `UPDATE topup_transactions SET amount = $1, method = $2, occurred_at = $3
     WHERE id = $4`,
        [amount, newMethod, newOccurredAt, entry.id]
    );

    return {
        before,
        after: {
            amount,
            method: newMethod,
            timestamp: newOccurredAt.toISOString()
        }
    };
}

async function deleteTopupHistory(discordUserId, index) {
    const wallet = await getWalletByDiscordId(discordUserId);
    if (!wallet) return null;

    const listRes = await query(
        `SELECT * FROM topup_transactions WHERE wallet_id = $1
     ORDER BY occurred_at DESC LIMIT $2`,
        [wallet.id, index]
    );

    if (listRes.rows.length < index) return null;
    const entry = listRes.rows[index - 1];

    await query(`DELETE FROM topup_transactions WHERE id = $1`, [entry.id]);

    return {
        amount: parseFloat(entry.amount),
        method: entry.method,
        timestamp: entry.occurred_at.toISOString()
    };
}

module.exports = {
    // Balance
    getBalance,
    setBalance,
    addBalance,
    removeBalance,
    // History
    recordTopup,
    getTopupHistory,
    updateTopupHistory,
    deleteTopupHistory,
    // Helpers
    ensureWallet,
    getWalletByDiscordId
};
