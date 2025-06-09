import { Pool } from 'pg';
import { DATABASE_URL } from '../constats';

const pool = new Pool({
    connectionString: DATABASE_URL ,
    ssl: { rejectUnauthorized: false }
});

export async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            side VARCHAR(10),
            order_type VARCHAR(10),
            qty NUMERIC,
            leverage INTEGER,
            stop_loss NUMERIC,
            take_profit NUMERIC,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

export default pool;