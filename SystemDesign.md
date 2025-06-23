# 🧩 System Design: Distributed Stock & Order Processing

## 1. 🛠️ Components Overview

- **Order Service**: Exposes API to accept order requests and pushes them to RabbitMQ.
- **Stock Service**: Syncs stock from vendor databases (via cron job) and exposes an API to update vendor stock.
- **Worker Service**: Consumes order messages, handles transactional stock updates, and notifies vendors via API.
- **RabbitMQ**: Manages order message queues with retry and dead-letter strategies.
- **PostgreSQL**: Separate databases for:
  - Aggregated stock (`ordersdb`)
  - VendorA (`vendoradb`)
  - VendorB (`vendorbdb`)

---

## 2. 🔁 Stock Sync Flow

- **Purpose**: Periodically pull latest stock from VendorA & VendorB databases and store in local `products` table.
- **How**:
  - `stock-service` uses multiple PostgreSQL clients to connect to vendor DBs.
  - Runs a `cron` job every 30 seconds.
  - For each product in each vendor DB:
    - Insert or update into local products table using `ON CONFLICT`.

---

## 3. 🛒 Order Placement Architecture

- **Step 1**: Client hits `/order` API on `order-service`.
- **Step 2**: Order message (productId, quantity) is pushed to RabbitMQ (`orders_queue`).
- **Step 3**: Worker consumes the message:
  - Begins DB transaction
  - Locks product row (`FOR UPDATE`)
  - Decreases stock if available
  - Commits order
  - Pushes message to vendor sync queue (async)

---

## 4. 📬 Queue-Based Worker Model

### Queues

| Queue                  | Description                                 |
|------------------------|---------------------------------------------|
| `orders_queue`         | Main queue for new order messages           |
| `orders_retry_queue`   | Retry queue with TTL of 5 seconds           |
| `orders_dlq`           | Final fallback for failed messages          |
| `vendor_sync`          | Vendor stock update queue                   |
| `vendor_sync_retry`    | Retry queue for vendor stock updates        |
| `vendor_sync_dlq`      | DLQ for vendor stock sync                   |

### Retry Logic

- **Order processing**:
  - Retry up to 3 times using `x-retry-count`
  - Send to `orders_retry_queue` with TTL
  - Route to `orders_dlq` on max failure

- **Vendor sync**:
  - Pushed to `vendor_sync` queue after local order success
  - Retry logic managed by separate vendor sync worker

---

## 5. ✅ Consistency Guarantees

- **Atomic Transactions**:
  - Orders and local stock updates use PostgreSQL transactions.
- **Eventual Vendor Consistency**:
  - Vendor stock updates are async via queue.
  - Failures are retried with TTL queues.
- **Idempotency**:
  - Stock sync uses `ON CONFLICT`.
  - Queues are durable and persistent.

---

## 6. 🔄 Vendor Sync Worker with Retry Queue

A dedicated worker listens on the `vendor_sync` queue. When a stock update fails (e.g., vendor API down), the message is retried via `vendor_sync_retry` with a delay. After 3 attempts, it is moved to `vendor_sync_dlq`. This ensures eventual consistency without blocking order processing. Retry metadata is stored in headers (`x-retry-count`) to manage attempt tracking.

---

## 7. 🔒 Assumptions

- Vendor product IDs follow naming convention (`p1`, `p2`, etc.).
- Vendor APIs may fail; sync is retried via queues.
- Vendors are mocked using separate local PostgreSQL DBs.
- System prioritizes **eventual consistency** for vendor updates.
