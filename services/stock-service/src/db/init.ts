import { localDb, vendorADb, vendorBDb } from './client';

const createProductTableQuery = `
  CREATE TABLE IF NOT EXISTS products (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    stock INT NOT NULL
  );
`;

const seedVendorAProducts = [
  { id: 'p1', name: 'Product A1', stock: 10 },
  { id: 'p2', name: 'Product A2', stock: 15 }
];

const seedVendorBProducts = [
  { id: 'p3', name: 'Product B1', stock: 20 },
  { id: 'p2', name: 'Product A2', stock: 5 },
  // { id: 'p4', name: 'Product B2', stock: 12 }
];

export async function initDB() {
  try {
    // Create tables
    await localDb.query(createProductTableQuery);
    await vendorADb.query(createProductTableQuery);
    await vendorBDb.query(createProductTableQuery);

    console.log("All 3 tables created in  localdb vendorA VendorB")

    // Seed Vendor A DB
    for (const product of seedVendorAProducts) {
      await vendorADb.query(`
        INSERT INTO products (id, name, stock)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [product.id, product.name, product.stock]);
    }

    // Seed Vendor B DB
    for (const product of seedVendorBProducts) {
      await vendorBDb.query(`
        INSERT INTO products (id, name, stock)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO NOTHING
      `, [product.id, product.name, product.stock]);
    }

    console.log('Databases initialized and seeded.');
  } catch (err: any) {
    console.error('Error initializing databases:', err.message);
  }
}



