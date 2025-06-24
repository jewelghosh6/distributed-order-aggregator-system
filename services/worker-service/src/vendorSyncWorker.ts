import { connect } from 'amqplib';
import { updateVendorStock } from './utils/updateVendorStock';

const RABBIT_URL = process.env.RABBIT_URL!;
const VENDOR_SYNC_QUEUE = 'vendor_sync';
const VENDOR_RETRY_QUEUE = 'vendor_sync_retry';
const VENDOR_DLQ = 'vendor_sync_dlq';

export async function startVendorSyncWorker() {
  const conn = await connect(RABBIT_URL);
  const channel = await conn.createChannel();

  await channel.assertQueue(VENDOR_DLQ, { durable: true });
  await channel.assertQueue(VENDOR_RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': VENDOR_SYNC_QUEUE,
      'x-message-ttl': 5000
    }
  });
  await channel.assertQueue(VENDOR_SYNC_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': VENDOR_DLQ
    }
  });

  channel.consume(VENDOR_SYNC_QUEUE, async (msg) => {
    if (!msg) return;

    console.log("Inside vendor sync queue");

    const { vendor, productId, quantity } = JSON.parse(msg.content.toString());
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0;

    try {
      await updateVendorStock(vendor, productId, quantity);
      console.log(`Vendor stock updated: ${vendor} - ${productId}`);
      channel.ack(msg);
    } catch (err: any) {
      console.error(`Vendor sync failed:`, err.message);

      if (retryCount >= 3) {
        console.warn('Max vendor retries reached. Sending to DLQ.');
        channel.nack(msg, false, false);
      } else {
        channel.sendToQueue(VENDOR_RETRY_QUEUE, Buffer.from(JSON.stringify({ vendor, productId, quantity })), {
          headers: { 'x-retry-count': retryCount + 1 },
          persistent: true
        });
        channel.ack(msg);
      }
    }
  });

  console.log('Vendor sync worker running...');
}

