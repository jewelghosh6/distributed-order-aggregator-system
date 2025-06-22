import { pool } from "./client";

export async function initializeDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id VARCHAR NOT NULL,
      quantity INT NOT NULL,
      status VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✅ Order table created or already exists");
}
