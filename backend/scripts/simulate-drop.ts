/**
 * Concurrency Simulation: 100 Parallel Reserve Requests
 * 
 * Usage:
 *   npx ts-node scripts/simulate-drop.ts [BASE_URL]
 * 
 * Examples:
 *   npx ts-node scripts/simulate-drop.ts                          # localhost:3000
 *   npx ts-node scripts/simulate-drop.ts https://your-app.pxxl.app # deployed
 */

const BASE_URL = process.argv[2] || 'http://127.0.0.1:3000';
const API = `${BASE_URL}/api`;

const CONCURRENT_USERS = 100;
const TEST_EMAIL = `loadtest_${Date.now()}@test.com`;
const TEST_PASS = 'TestPassword123';

async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function run() {
  console.log(`\n🚀 Concurrency Simulation — ${CONCURRENT_USERS} parallel users`);
  console.log(`   Target: ${BASE_URL}\n`);

  // 1. Register + login test user
  console.log('1️⃣  Registering test user...');
  await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
  });

  const loginRes = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
  });

  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.token;
  const userId = loginRes.body.user.id;
  console.log(`   ✅ Logged in as ${TEST_EMAIL} (id: ${userId})\n`);

  // 2. Get first product
  console.log('2️⃣  Fetching products...');
  const productsRes = await apiFetch('/products');
  const products = productsRes.body.data || productsRes.body;
  if (!products || products.length === 0) {
    console.error('❌ No products found');
    process.exit(1);
  }

  const product = products.find((p: any) => p.stock > 10) || products[0];
  const initialStock = product.stock;
  console.log(`   Product: "${product.title}" | Initial stock: ${initialStock}\n`);

  if (initialStock <= 0) {
    console.error('❌ Product has 0 stock. Seed the database first (npm run db:seed).');
    process.exit(1);
  }

  // 3. Fire CONCURRENT_USERS parallel reserve requests
  console.log(`3️⃣  Firing ${CONCURRENT_USERS} parallel reserve requests...`);
  const startTime = Date.now();

  const requests = Array.from({ length: CONCURRENT_USERS }).map(() =>
    apiFetch('/checkout/reserve', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        userId,
        productId: product.id,
        quantity: 1,
        idempotencyKey: crypto.randomUUID(),
      }),
    })
  );

  const results = await Promise.allSettled(requests);
  const elapsed = Date.now() - startTime;

  // 4. Count results
  let successes = 0;
  let outOfStock = 0;
  let rateLimited = 0;
  let otherErrors = 0;

  for (const r of results) {
    if (r.status === 'rejected') {
      otherErrors++;
      continue;
    }
    const { status } = r.value;
    if (status === 202) successes++;
    else if (status === 409) outOfStock++;
    else if (status === 429) rateLimited++;
    else otherErrors++;
  }

  console.log(`   ⏱  Completed in ${elapsed}ms\n`);

  // 5. Check final stock
  console.log('4️⃣  Checking final stock...');
  const finalProductRes = await apiFetch(`/products/${product.id}`);
  const finalStock = finalProductRes.body.stock;

  // 6. Print results
  console.log('\n' + '═'.repeat(50));
  console.log('  CONCURRENCY SIMULATION RESULTS');
  console.log('═'.repeat(50));
  console.log(`  Total requests:      ${CONCURRENT_USERS}`);
  console.log(`  Successful reserves: ${successes}`);
  console.log(`  Out of stock (409):  ${outOfStock}`);
  console.log(`  Rate limited (429):  ${rateLimited}`);
  console.log(`  Other errors:        ${otherErrors}`);
  console.log('─'.repeat(50));
  console.log(`  Initial stock:       ${initialStock}`);
  console.log(`  Final stock:         ${finalStock}`);
  console.log(`  Expected reserves:   ${initialStock} (= initial stock)`);
  console.log('═'.repeat(50));

  // 7. Verdict
  const stockNeverNegative = finalStock >= 0;
  const noOverselling = successes <= initialStock;

  if (stockNeverNegative && noOverselling) {
    console.log('\n  ✅ PASS — Stock never went negative. No overselling detected.');
    console.log(`  ✅ Exactly ${successes} out of ${CONCURRENT_USERS} requests succeeded.`);
    console.log(`  ✅ Final stock is ${finalStock} (expected ${initialStock - successes}).\n`);
  } else {
    console.log('\n  ❌ FAIL — RACE CONDITION DETECTED!');
    if (!stockNeverNegative) console.log(`  ❌ Stock went NEGATIVE: ${finalStock}`);
    if (!noOverselling) console.log(`  ❌ Oversold: ${successes} reserves but only ${initialStock} stock`);
    console.log('');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
