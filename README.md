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

## How to run locally (Docker Monolith)

We have containerized the entire stack for a true "one-click" experience. The frontend, backend, and database are orchestrated together. The backend is configured to statically serve the compiled React frontend, effectively making them a monolith running on a single port.

1. Make sure Docker Desktop is running.
2. Open your terminal in the root folder and run:
```bash
docker-compose up --build
```
3. That's it! 
   - Docker will download PostgreSQL.
   - It will build the frontend, build the backend, and package them together.
   - Upon startup, the container automatically migrates the database (`prisma db push`) and seeds it with test products (`prisma db seed`).
   - Open your browser to **http://localhost:3000**.

### Run Concurrency Test
To prove that overselling is impossible, you can run the automated concurrency test (spawns 100 parallel requests) locally:
```bash
cd backend
npm install
npm run test:concurrency
```

---

## Deployment (Render / Railway / Pxxl)

Because this repository uses a unified Dockerfile that packages both the React frontend and Node.js backend into a single container, deployment is incredibly simple:

1. Create a new **Web Service**.
2. Select **Docker** as the deployment type.
3. Configure the following environment variables:
   - `DATABASE_URL`: Your production PostgreSQL connection string.
   - `JWT_SECRET`: A secure random string for signing auth tokens.
4. (Optional) Set the Build/Root Directory to `/` or leave it empty.
5. Deploy. The platform will read the root `Dockerfile`, build both apps, and route all web traffic to port 3000 automatically. No CORS issues, no separate frontend deployment needed.
