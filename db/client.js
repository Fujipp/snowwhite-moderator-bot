const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;

function getPool() {
    if (!DATABASE_URL) {
        return null;
    }
    if (!pool) {
        pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }
    return pool;
}

async function query(text, params) {
    const p = getPool();
    if (!p) throw new Error('DATABASE_URL not set');
    return p.query(text, params);
}

async function initDb() {
    const p = getPool();
    if (!p) {
        console.log('⚠️ DATABASE_URL not set, skipping DB init');
        return false;
    }

    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await p.query(schema);
            console.log('✅ Database schema initialized');
        }
        return true;
    } catch (err) {
        console.error('❌ DB init failed:', err.message);
        return false;
    }
}

async function end() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

function isConnected() {
    return DATABASE_URL && pool !== null;
}

module.exports = {
    getPool,
    query,
    initDb,
    end,
    isConnected,
    DATABASE_URL
};
