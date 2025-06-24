import { connect } from 'amqplib';
import { pool } from './db/client';
import { initDB } from './db/init';
import { updateVendorStock } from './utils/updateVendorStock';
import { getVendorNameFromProductID } from './utils/getVendorNameFromProductID';
import { startVendorSyncWorker } from './vendorSyncWorker';

const RABBIT_URL = process.env.RABBIT_URL!;
const MAIN_QUEUE = 'orders_queue';
const RETRY_QUEUE = 'orders_retry_queue';
const DLQ_QUEUE = 'orders_dlq';

const VENDOR_SYNC_QUEUE='vendor_sync'

async function startWorker() {
  const conn = await connect(RABBIT_URL);
  const channel = await conn.createChannel();

  // Setup all queues with DLQ and TTL
  await channel.assertQueue(DLQ_QUEUE, { durable: true });
  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': MAIN_QUEUE,
      'x-message-ttl': 5000 // 5 sec delay
    }
  });
  await channel.assertQueue(MAIN_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': DLQ_QUEUE
    }
  });

  channel.consume(MAIN_QUEUE, async (msg) => {
    if (!msg) return;

    const order = JSON.parse(msg.content.toString());
    const headers = msg.properties.headers;
    const retryCount = headers!['x-retry-count'] || 0;

    const { productId, quantity } = order;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const stockRes = await client.query(
        `SELECT * FROM products WHERE id = $1 FOR UPDATE`,
        [productId]
      );

      if (stockRes.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
      }

      const product = stockRes.rows[0];

      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for ${productId}`);
      }

      await client.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [quantity, productId]
      );

      await client.query(
        `INSERT INTO orders (product_id, quantity, status) VALUES ($1, $2, $3)`,
        [productId, quantity, 'CONFIRMED']
      );

      await client.query('COMMIT');

      const vendor = getVendorNameFromProductID(productId);



      // Tell vendor-sync service
      channel.sendToQueue(VENDOR_SYNC_QUEUE, Buffer.from(JSON.stringify({
        vendor, productId, quantity
      })), { persistent: true });

      console.log(`Order processed successfully for ${productId}`);
      channel.ack(msg);
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`Order failed for ${productId}:`, err.message);

      if (retryCount >= 3) {
        console.warn('Max retry reached. Sending to DLQ.');
        channel.nack(msg, false, false); // Send to DLQ
      } else {
        console.warn(`Retrying... (attempt ${retryCount + 1})`);
        channel.sendToQueue(RETRY_QUEUE, Buffer.from(JSON.stringify(order)), {
          headers: { 'x-retry-count': retryCount + 1 },
          persistent: true
        });
        channel.ack(msg);
      }
    } finally {
      client.release();
    }
  });

  console.log('Worker is listening to queue...');
}

initDB().then(startWorker);

startVendorSyncWorker().then(()=>console.log('Vendor worker started running'));


