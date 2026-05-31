# Limited Drop Product System

## 1. How race conditions were handled
To protect against race conditions (specifically Lost Updates) during concurrent requests, the "read-modify-write" pattern in Node.js memory was strictly avoided.
Instead, atomic database operations were utilized: stock deduction occurs via an atomic decrement operator with a simultaneous stock check (`WHERE stock >= quantity`) inside a single `prisma.$transaction`. 
This atomic update leverages an implicit **pessimistic row-level lock** (cursor stability) for the duration of the transaction. The database queues concurrent updates, ensuring absolute correctness and making overselling mathematically impossible.

## 2. Why certain schema decisions were made
*   **ACID Transactions:** A relational database (PostgreSQL) was chosen for its native ACID properties, which are critical for financial/inventory systems where strict consistency is non-negotiable.
*   **Idempotency & Unique Constraints:** A database-level `UNIQUE` constraint on the `idempotencyKey` column guarantees protection against duplicate transaction execution during Network Interruptions or client retries.
*   **UUID Primary Keys:** Using UUIDs instead of auto-incrementing integers lays the foundation for future Horizontal Scaling (Sharding). It prevents ID collisions across distributed database nodes.
*   **Composite Indexes:** An `@@index([status, expiresAt])` prevents Full Table Scans by the background worker searching for expired reservations.
*   **Referential Integrity & Audit:** Strict `onDelete: Restrict` prevents orphan records. An `InventoryLog` table records every stock change atomically within the same transaction.

## 3. Trade-offs
*   **Pessimistic Row Locking vs. Throughput:** The atomic decrement is a form of pessimistic row-level locking. While it mathematically guarantees protection against Lost Updates, at 10,000 concurrent requests to the *exact same item*, it will cause severe Lock Contention. Transactions will queue up in PostgreSQL, leading to a cascade of database timeouts.
*   **Relational DB vs NoSQL:** PostgreSQL guarantees strict consistency, but horizontally scaling (sharding) a relational database is significantly more complex compared to distributed NoSQL databases.
*   **Polling vs WebSockets:** Using client-side polling every 5 seconds simplifies the architecture but generates redundant background load.

## 4. What would break at 10k concurrent users
*   **The Hotspot / Celebrity Key Problem:** 10,000 users attacking a single limited item will direct all traffic to a single database row (and single database shard), rendering horizontal DB scaling completely useless for that specific item.
*   **Connection Pool Exhaustion:** The Node.js cluster will rapidly exhaust its connection limit to PostgreSQL. Each request holds a connection while waiting in the row-lock queue.
*   **Self-DDoS & Ephemeral Ports:** Aggressive client-side polling (every 5 seconds) from 10,000 active tabs will not only overwhelm the Node.js Event Loop, but instantly exhaust the limit of open file descriptors and ephemeral TCP ports on both the load balancers and backend servers.

## 5. How you'd scale it
*   **Redis as the Single Source of Truth (Atomic Lua Scripts):** To solve the Hotspot problem and avoid PostgreSQL lock contention, the inventory counter must be moved to an In-Memory store (Redis). Atomic deductions are handled strictly via Lua scripts inside Redis (guaranteeing thread-safe execution without heavy locks).
*   **Message Queue (Decoupling):** After a successful deduction in Redis, the request is pushed to a Message Queue (RabbitMQ / Kafka). Background workers asynchronously process this queue to create the permanent relational records and audit logs in PostgreSQL at a controlled, safe rate.
*   **WebSockets / SSE (Transport Layer Upgrade):** To fix the polling Self-DDoS, HTTP polling must be replaced with WebSockets or Server-Sent Events (SSE). Leveraging the Reactor pattern and non-blocking I/O, a single Node.js process can efficiently maintain tens of thousands of idle connections with minimal memory overhead, pushing stock updates only when actual changes occur.

---

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
