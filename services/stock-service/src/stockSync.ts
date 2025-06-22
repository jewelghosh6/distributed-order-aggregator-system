
import { Pool } from "pg";
import { localDb, vendorADb, vendorBDb } from "./db/client";

async function syncVendorProducts(vendorDb:Pool, label: string) {
  try {
    const result = await vendorDb.query('SELECT * FROM products');
    const products = result.rows;

    for (const product of products) {
      await localDb.query(`
        INSERT INTO products (id, name, stock)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET stock = EXCLUDED.stock
      `, [product.id, product.name, product.stock]);
    }

    console.log(`Synced from ${label}`);
  } catch (err: any) {
    console.error(`Error syncing from ${label}:`, err.message);
  }
}

export async function runSyncJob() {
  await syncVendorProducts(vendorADb, 'VendorA');
  await syncVendorProducts(vendorBDb, 'VendorB');
}
