# Limited Drop Product System

## How to run locally

### 1. Database & Backend
Ensure you have a PostgreSQL database running.
```bash
cd backend
npm install
# Set DATABASE_URL and JWT_SECRET in .env
npm run build
npm run db:seed
npm start
```

### 2. Frontend
```bash
cd frontend
npm install
# Set VITE_API_URL in .env (e.g. http://localhost:3000/api)
npm run dev
```

### 3. Run Concurrency Test
To prove that overselling is impossible, run the automated concurrency test (spawns 100 parallel requests):
```bash
cd backend
npm run test:concurrency
```

---

## 1. How race conditions were handled
To protect against race conditions during concurrent requests, the "read-modify-write" pattern in Node.js memory was strictly avoided.
Instead, atomic database operations were utilized: stock deduction occurs via an atomic decrement operator with a simultaneous stock check (`WHERE stock >= quantity`) inside a single `prisma.$transaction`.
To prevent duplicate requests during network failures, strict API idempotency was implemented: every reservation request includes a unique `idempotencyKey` validated by a database unique constraint.

## 2. Why certain schema decisions were made
*   **ACID Transactions:** A relational database (PostgreSQL) was chosen because of its native support for ACID (Atomicity, Consistency, Isolation, Durability) properties, which is critical for financial and inventory operations, unlike NoSQL solutions where strict consistency requires complex programmatic implementations.
*   **Composite Indexes:** An `@@index([status, expiresAt])` was added to the `Reservation` table. This prevents Full Table Scans by the background worker searching for expired reservations.
*   **Referential Integrity:** Strict `onDelete: Restrict` constraints were applied to relation models (e.g., `Order`) to prevent orphan records from accidental deletion of products or users.
*   **Audit Trail:** An `InventoryLog` table was introduced to record every stock change. The log entry is created strictly atomically within the same transaction as the stock deduction.

## 3. Trade-offs
*   **Relational DB vs NoSQL:** Choosing PostgreSQL guarantees strict consistency and transaction reliability, but horizontally scaling (sharding) a relational database is significantly more complex compared to NoSQL databases.
*   **Polling vs WebSockets:** Using client-side polling every 5 seconds for stock updates simplifies the frontend and backend architecture, but creates redundant background load on the server.
*   **Optimistic vs Pessimistic Locking:** An optimistic approach (via atomic decrement) was used. This provides high throughput, but during massive concurrent requests for a single item, many requests will be rejected by the database. Pessimistic locking (`SELECT ... FOR UPDATE`) would solve this by queueing requests, but would drastically reduce system throughput.

## 4. What would break at 10k concurrent users
*   **Lock Contention:** 10,000 users attempting to simultaneously update a single `Product` row (the stock of a specific item) will cause severe lock contention at the database level, leading to a cascading spike in lock timeouts.
*   **Connection Pool Exhaustion:** The Node.js process will rapidly exhaust its connection limit to PostgreSQL, as each transaction will hold a connection waiting for a response from the overloaded disk.
*   **Event Loop Blockage:** The single-threaded Node.js Event Loop will be overwhelmed by parsing 10,000 JSON requests and handling polling, increasing latency to unacceptable levels and causing false timeouts.
*   **Self-DDoS:** Client-side polling (every 5 seconds) from 10,000 active browser tabs will generate a steady 2,000 requests per second (RPS) purely for stock reads, which will crash the API without caching.

## 5. How you'd scale it
*   **Implementing a Message Queue (Decoupling):** Decoupling the synchronous HTTP request from heavy database writes. Incoming reservation requests should be pushed to a queue (RabbitMQ, Redis Streams, or BullMQ), while background workers process them at a controlled rate, preventing database overload.
*   **Defensive Caching:** Offloading catalog and stock read operations to an In-Memory Cache (Redis). This will relieve load from PostgreSQL (read-scaling).
*   **Rate Limiting at the Gateway Level:** Implementing strict request rate limiting (e.g., Token Bucket algorithm) at the Nginx, HAProxy, or API Gateway level before the traffic even reaches the Node.js servers.
