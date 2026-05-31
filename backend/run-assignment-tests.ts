// using native fetch
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';
const TIMEOUT = 15000;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=============================================');
  console.log('🏃‍♂️ RUNNING ASSIGNMENT TESTS');
  console.log('=============================================');

  // Find a product
  const product = await prisma.product.findFirst({
    where: { stock: { gt: 10 } }
  });

  if (!product) {
    console.log('❌ No product with stock > 10 found for testing.');
    process.exit(1);
  }

  console.log(`Target Product: ${product.name} (ID: ${product.id}, Stock: ${product.stock})`);

  // Register a test user
  let token = '';
  let userId = '';
  try {
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `test_${Date.now()}@test.com`, password: 'Password123' })
    });
    const authData = await registerRes.json() as any;
    token = authData.token;
    userId = authData.user.id;
  } catch (e: any) {
    console.log('❌ FAIL: Could not register test user', e.message);
    process.exit(1);
  }

  // --- TEST 1: RESERVATION LOGIC & API ERROR HANDLING (Over-limit) ---
  console.log('\n--- TEST 1: RESERVATION LOGIC (Over-limit) ---');
  try {
    const res = await fetch(`${API_URL}/checkout/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        userId,
        productId: product.id,
        quantity: 99999
      })
    });
    
    if (res.ok) {
      console.log('❌ FAIL: System allowed reserving more than stock!');
    } else {
      if (res.status === 400 || res.status === 409) {
        console.log('✅ PASS: API correctly rejected over-limit reservation.');
      } else {
        console.log(`❌ FAIL: Unexpected error status: ${res.status}`);
      }
    }
  } catch (error: any) {
    console.log(`❌ FAIL: Unexpected error: ${error.message}`);
  }

  // --- TEST 2: CONCURRENCY SIMULATION ---
  console.log('\n--- TEST 2: CONCURRENCY SIMULATION (100 Requests) ---');
  let successes = 0;
  let failures = 0;
  const requests = [];
  
  for (let i = 0; i < 100; i++) {
    requests.push(
      fetch(`${API_URL}/checkout/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          userId,
          productId: product.id,
          quantity: 1,
          idempotencyKey: crypto.randomUUID()
        })
      })
      .then(res => {
        if (res.ok) successes++;
        else failures++;
      })
      .catch(() => { failures++; })
    );
  }

  await Promise.all(requests);
  console.log(`Total Requests: 100`);
  console.log(`Successes: ${successes}`);
  console.log(`Failures/Rejected (Out of Stock / Race prevented): ${failures}`);

  const finalProduct = await prisma.product.findUnique({ where: { id: product.id } });
  console.log(`Final Stock in DB: ${finalProduct?.stock}`);
  
  if (finalProduct && finalProduct.stock >= 0) {
    console.log('✅ PASS: Concurrency handled safely. Stock never went negative.');
  } else {
    console.log('❌ FAIL: Race condition allowed negative stock!');
  }

  // --- TEST 3: EXPIRATION LOGIC ---
  console.log('\n--- TEST 3: EXPIRATION LOGIC ---');
  console.log('Creating a reservation manually and backdating it 6 minutes to force expiration...');
  
  // Get stock before
  const prodBefore = await prisma.product.findUnique({ where: { id: product.id } });
  
  // Create reservation that is already expired
  const expiredRes = await prisma.reservation.create({
    data: {
      userId,
      productId: product.id,
      quantity: 1,
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 6 * 60 * 1000) // 6 mins ago
    }
  });

  // Deduct stock manually for the test setup
  await prisma.product.update({
    where: { id: product.id },
    data: { stock: { decrement: 1 } }
  });

  console.log('Waiting 10 seconds for the backend scheduler to pick it up and expire it...');
  await delay(10000); // Scheduler runs every 5-10s usually

  const resAfter = await prisma.reservation.findUnique({ where: { id: expiredRes.id } });
  const prodAfter = await prisma.product.findUnique({ where: { id: product.id } });

  if (resAfter?.status === 'EXPIRED') {
    console.log('✅ PASS: Reservation status was automatically set to EXPIRED.');
    if (prodAfter && prodBefore && prodAfter.stock === prodBefore.stock) {
      console.log('✅ PASS: Stock was restored perfectly.');
    } else {
      console.log('❌ FAIL: Stock was not restored.');
    }
  } else {
    console.log('❌ FAIL: Reservation was not expired automatically. (Is the worker running?)');
  }

  // Cleanup
  await prisma.reservation.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  console.log('\n=============================================');
  console.log('🏁 ALL TESTS COMPLETED');
  console.log('=============================================');
  process.exit(0);
}

runTests().catch(e => {
  console.error('Fatal Test Error:', e);
  process.exit(1);
});
