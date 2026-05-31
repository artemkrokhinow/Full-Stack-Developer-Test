import React, { useState } from 'react';
import { api } from '../services/api';
import type { Product } from '../services/api';

interface TestDropPageProps {
  products: Product[];
  onBack: () => void;
}

type TestType = 'concurrency' | 'idempotency' | 'overlimit';

export const TestDropPage: React.FC<TestDropPageProps> = ({ products, onBack }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{
    type: TestType;
    successes: number;
    outOfStock: number;
    rateLimited: number;
    otherErrors: number;
    initialStock: number;
    finalStock: number | null;
  } | null>(null);

  const [targetProductId, setTargetProductId] = useState<string | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const runTest = async (type: TestType) => {
    setIsRunning(true);
    setLogs([]);
    setResults(null);

    const targetProduct = targetProductId 
      ? products.find(p => p.id === targetProductId) 
      : products[0];
    if (!targetProduct) {
      addLog('❌ No products found to test.');
      setIsRunning(false);
      return;
    }

    if (targetProduct.stock <= 0) {
      addLog(`❌ Product "${targetProduct.title}" has 0 stock. Wait for expiration or seed DB.`);
      setIsRunning(false);
      return;
    }

    try {
      addLog(`🚀 Starting Test: ${type.toUpperCase()}`);
      addLog(`   Target Product: "${targetProduct.title}"`);
      addLog(`   Initial Stock: ${targetProduct.stock}`);

      addLog('1️⃣ Registering temporary test user...');
      const testEmail = `frontend_test_${Date.now()}@test.com`;
      const authRes = await api.register(testEmail, 'Password123');
      const testUserId = authRes.user.id;
      addLog(`   ✅ Logged in as ${testEmail}`);

      let requests: Promise<any>[] = [];
      const startTime = Date.now();

      if (type === 'concurrency') {
        addLog('2️⃣ Firing 100 parallel reserve requests...');
        requests = Array.from({ length: 100 }).map(() =>
          api.reserve(testUserId, targetProduct.id, 1)
        );
      } else if (type === 'idempotency') {
        addLog('2️⃣ Firing 5 duplicate requests (Network Retry Simulation)...');
        addLog('   Using the exact same idempotency key for all 5 requests.');
        const sharedKey = crypto.randomUUID();
        requests = Array.from({ length: 5 }).map(() =>
          api.reserve(testUserId, targetProduct.id, 1, sharedKey)
        );
      } else if (type === 'overlimit') {
        addLog('2️⃣ Firing 1 request attempting to reserve 99,999 items...');
        requests = [api.reserve(testUserId, targetProduct.id, 99999)];
      }

      const settlement = await Promise.allSettled(requests);
      const elapsed = Date.now() - startTime;
      addLog(`   ⏱ Completed in ${elapsed}ms`);

      let successes = 0;
      let outOfStock = 0;
      let rateLimited = 0;
      let otherErrors = 0;

      settlement.forEach(r => {
        if (r.status === 'fulfilled') {
          successes++;
        } else {
          const errMsg = r.reason?.message?.toLowerCase() || '';
          if (errMsg.includes('out of stock') || errMsg.includes('409') || errMsg.includes('race condition')) {
            outOfStock++;
          } else if (errMsg.includes('429') || errMsg.includes('rate')) {
            rateLimited++;
          } else {
            otherErrors++;
          }
        }
      });

      addLog('3️⃣ Checking final stock...');
      const finalProduct = await api.getProduct(targetProduct.id);
      
      setResults({
        type,
        successes,
        outOfStock,
        rateLimited,
        otherErrors,
        initialStock: targetProduct.stock,
        finalStock: finalProduct.stock,
      });

      addLog(`🏁 Test Finished!`);
    } catch (err: any) {
      addLog(`❌ Fatal Test Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const renderResultAlert = () => {
    if (!results) return null;
    if (results.finalStock === null) return null;

    if (results.type === 'concurrency') {
      const passed = results.finalStock >= 0 && results.successes <= results.initialStock;
      if (passed) {
        return <div className="alert alert-success" style={{ margin: 0 }}><strong>✅ PASS (Concurrency):</strong> Stock never went negative. Expected {results.initialStock} success, got {results.successes}.</div>;
      }
      return <div className="alert alert-error" style={{ margin: 0 }}><strong>❌ FAIL:</strong> Race condition detected! Final stock is {results.finalStock}.</div>;
    }

    if (results.type === 'idempotency') {
      const passed = results.successes === 1 && results.initialStock - results.finalStock === 1;
      if (passed) {
        return <div className="alert alert-success" style={{ margin: 0 }}><strong>✅ PASS (Idempotency):</strong> 5 duplicate requests sent, but only 1 reservation created. No extra stock deducted!</div>;
      }
      return <div className="alert alert-error" style={{ margin: 0 }}><strong>❌ FAIL:</strong> Idempotency failed. {results.successes} reservations created.</div>;
    }

    if (results.type === 'overlimit') {
      const passed = results.successes === 0 && results.outOfStock === 1 && results.initialStock === results.finalStock;
      if (passed) {
        return <div className="alert alert-success" style={{ margin: 0 }}><strong>✅ PASS (Overlimit):</strong> System correctly rejected reservation larger than available stock.</div>;
      }
      return <div className="alert alert-error" style={{ margin: 0 }}><strong>❌ FAIL:</strong> System allowed overselling!</div>;
    }

    return null;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={onBack}>← Back to Catalog</button>
        <h2 style={{ margin: 0, color: 'var(--accent)' }}>System Architecture Tests</h2>
        <div style={{ width: '120px' }} />
      </div>

      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3 style={{ marginBottom: '16px' }}>Available Tests</h3>
        <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
          Run these architectural tests to prove that the backend safely handles concurrent stress, network retries (idempotency), and hard limits.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#4b5563', marginBottom: '8px' }}>
            Select Target Product
          </label>
          <select 
            className="form-control" 
            value={targetProductId || (products[0]?.id || '')} 
            onChange={e => setTargetProductId(e.target.value)}
            disabled={isRunning}
            style={{ maxWidth: '400px' }}
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.title || p.name} (Stock: {p.stock})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => runTest('concurrency')} 
            disabled={isRunning || products.length === 0}
            style={{ padding: '16px', fontSize: '16px', fontWeight: 'bold' }}
          >
            🔥 Test 1: Concurrency (100 Parallel Requests)
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => runTest('idempotency')} 
            disabled={isRunning || products.length === 0}
            style={{ padding: '16px', fontSize: '16px', fontWeight: 'bold' }}
          >
            🔄 Test 2: Idempotency (Network Retry Sim)
          </button>

          <button 
            className="btn btn-accent" 
            onClick={() => runTest('overlimit')} 
            disabled={isRunning || products.length === 0}
            style={{ padding: '16px', fontSize: '16px', fontWeight: 'bold' }}
          >
            🛑 Test 3: Over-limit (Reserve 99,999 items)
          </button>
        </div>

        {logs.length > 0 && (
          <div style={{ 
            marginTop: '30px', background: '#111827', color: '#10B981', padding: '20px', 
            borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5',
            whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        )}

        {results && (
          <div style={{ marginTop: '24px', padding: '24px', borderRadius: '8px', border: '2px solid var(--accent)', background: 'rgba(2, 132, 199, 0.05)' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--accent)' }}>📊 Final Results</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-solid)' }}>
                <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>Successful Reserves</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{results.successes}</div>
              </div>
              <div style={{ padding: '16px', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-solid)' }}>
                <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>Rejected / Failed</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)' }}>{results.outOfStock + results.otherErrors}</div>
              </div>
              <div style={{ padding: '16px', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-solid)' }}>
                <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>Rate Limited (429)</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'rgba(0,0,0,0.4)' }}>{results.rateLimited}</div>
              </div>
              <div style={{ padding: '16px', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-solid)' }}>
                <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.5)', marginBottom: '4px', textTransform: 'uppercase' }}>Final Stock Balance</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: results.finalStock !== null && results.finalStock >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {results.finalStock}
                </div>
              </div>
            </div>

            {renderResultAlert()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestDropPage;
