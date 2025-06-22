import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

export const localDb = new Pool({
  host: process.env.LOCAL_DB_HOST,
  port: +process.env.DB_PORT!,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME, // local DB
});

export const vendorADb = new Pool({
  host: process.env.VENDOR_A_DB_HOST,
  port: +process.env.DB_PORT!,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.VENDOR_A_DB_NAME, // mocked vendorA DB
});

export const vendorBDb = new Pool({
  host: process.env.VENDOR_B_DB_HOST,
  port: +process.env.DB_PORT!,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.VENDOR_B_DB_NAME, // VENDOR B DB
});

