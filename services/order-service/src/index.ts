import express, { Request, Response } from 'express';
import { initializeDB } from './db/init';
import { pool } from './db/client';
import { connect } from 'amqplib';

const app = express();
app.use(express.json());

const MAIN_QUEUE = 'orders_queue';
const DLQ_QUEUE = 'orders_dlq';


const APP_PORT= process.env.PORT

let channel: any;

async function connectToRabbit() {
  const conn = await connect(process.env.RABBIT_URL!);
  channel = await conn.createChannel();
  await channel.assertQueue(MAIN_QUEUE, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': DLQ_QUEUE
    }
  });
  await channel.assertQueue(DLQ_QUEUE, {
    durable: true
  });
  
}

app.post('/order', async (req:Request, res:Response):Promise<void> => {

  // console.log("REQ==> ",req)
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    res.status(400).json({ error: 'Invalid productId or quantity' });
  }

  const orderPayload = {
    productId,
    quantity,
    requestedAt: new Date().toISOString()
  };

  // Just enqueue — do not insert
  channel.sendToQueue(MAIN_QUEUE, Buffer.from(JSON.stringify(orderPayload)),{ persistent: true });

  res.status(202).json({ message: "Order received and queued" });
});

(async () => {
  await initializeDB();
  await connectToRabbit();
  app.listen(APP_PORT, () => console.log(`Order service on port ${APP_PORT}`));
})();
