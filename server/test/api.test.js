const app = require('../src/app');
const http = require('http');

let server;
let baseUrl;

async function runTests() {
  console.log('\n=======================================================');
  console.log('   Scan2Go — Automated Integration Test Suite');
  console.log('=======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASSED: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAILED: ${message}`);
      failed++;
    }
  }

  // Start test server
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;

  try {
    // TEST 1: Customer Login
    console.log('\n[Phase 1: Auth & User Session]');
    const loginRes = await request('POST', '/auth/login', { email: 'customer@scan2go.com', password: 'customer123' });
    assert(loginRes.status === 200 && loginRes.body.success, 'Customer login returns HTTP 200 & JWT token');
    const customerToken = loginRes.body.data.token;
    const customerId = loginRes.body.data.user.id;

    // Security Staff Login
    const securityLogin = await request('POST', '/auth/login', { email: 'security@scan2go.com', password: 'security123' });
    assert(securityLogin.status === 200 && securityLogin.body.data.user.role === 'security', 'Security Staff login verified');
    const securityToken = securityLogin.body.data.token;

    // Admin Login
    const adminLogin = await request('POST', '/auth/login', { email: 'admin@scan2go.com', password: 'admin123' });
    assert(adminLogin.status === 200 && adminLogin.body.data.user.role === 'admin', 'Admin login verified');
    const adminToken = adminLogin.body.data.token;

    // TEST 2: Barcode Lookup
    console.log('\n[Phase 2: Barcode Lookup]');
    const barcodeRes = await request('GET', '/products/barcode/8901234567890');
    assert(barcodeRes.status === 200 && barcodeRes.body.data.name.includes('Milk'), 'Barcode 8901234567890 resolves to Milk 1L');

    // TEST 3: Add to Cart & Server Price Verification
    console.log('\n[Phase 3: Cart Management & Price Security]');
    await request('DELETE', '/cart', null, customerToken);
    const addCartRes = await request('POST', '/cart/items', { barcode: '8901234567890', quantity: 2 }, customerToken);
    assert(addCartRes.status === 200 && addCartRes.body.data.subtotal === 136.00, 'Cart subtotal calculated server-side (2 × ₹68.00 = ₹136.00)');
    assert(addCartRes.body.data.total_amount === 142.80, 'Cart total includes 5% GST (₹136 + ₹6.80 = ₹142.80)');

    // TEST 4: Create Order & Server Snapshots
    console.log('\n[Phase 4: Order Creation & Server Calculation]');
    const createOrderRes = await request('POST', '/orders', {}, customerToken);
    assert(createOrderRes.status === 201 && createOrderRes.body.data.status === 'PENDING', 'Order created with PENDING status');
    const orderId = createOrderRes.body.data.id;

    // TEST 5: Payment Processing & QR Generation
    console.log('\n[Phase 5: Payment Abstraction & Cryptographic QR Pass]');
    const payRes = await request('POST', '/payments/verify', { order_id: orderId, payment_method: 'CARD_SIMULATION' }, customerToken);
    assert(payRes.status === 200 && payRes.body.data.payment_status === 'SUCCESS', 'Mock Payment verified successfully');
    assert(payRes.body.data.qr_pass && payRes.body.data.qr_pass.raw_token.length === 64, 'Cryptographic 64-char hex QR exit pass generated');
    const rawQrToken = payRes.body.data.qr_pass.raw_token;

    // TEST 6: Atomic Exit Gate Verification by Security Staff
    console.log('\n[Phase 6: Atomic Exit Gate & Single-Use Verification]');
    const verify1 = await request('POST', '/security/verify', { token: rawQrToken }, securityToken);
    assert(verify1.status === 200 && verify1.body.data.valid === true && verify1.body.data.status === 'EXITED', 'Security Staff verified exit pass (PAID -> EXITED)');

    // TEST 7: Re-scan / Repeated Exit Pass Verification
    const verify2 = await request('POST', '/security/verify', { token: rawQrToken }, securityToken);
    assert(verify2.status === 200 && verify2.body.data.valid === true && verify2.body.data.already_exited === true, 'Second scan attempt re-verifies successfully with already_exited flag');

    // TEST 8: IDOR Authorization Security Test
    console.log('\n[Phase 7: IDOR Protection & RBAC Enforcement]');
    const customer2Login = await request('POST', '/auth/register', { full_name: 'Bob User', email: `bob_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`, password: 'password123' });
    const customer2Token = customer2Login.body.data.token;

    const idorAttempt = await request('GET', `/orders/${orderId}`, null, customer2Token);
    assert(idorAttempt.status === 403, 'Customer 2 attempting to view Customer 1 order is blocked with HTTP 403 FORBIDDEN');

    // TEST 9: Admin Dashboard & Inventory Audit
    console.log('\n[Phase 8: Admin Dashboard & Inventory Audit]');
    const adminMetrics = await request('GET', '/admin/dashboard', null, adminToken);
    assert(adminMetrics.status === 200 && adminMetrics.body.data.today_orders >= 1, 'Admin Dashboard retrieves real-time order metrics');

    const stockAdjust = await request('POST', '/admin/inventory/adjust', { product_id: 'f0000000-0000-0000-0000-000000000001', quantity: 50, action: 'add', reason: 'New shipment delivery' }, adminToken);
    assert(stockAdjust.status === 200 && stockAdjust.body.data.stock_quantity > 0, 'Admin stock adjustment succeeded with inventory log');

    // TEST 10: Price & Financial Manipulation Defense
    console.log('\n[Phase 9: Untrusted Price & Financial Manipulation Defense]');
    const spoofedCart = await request('POST', '/cart/items', { barcode: '8901234567890', quantity: 1, price: 0.01, subtotal: 0.01, total_amount: 0.01 }, customerToken);
    assert(spoofedCart.status === 200 && spoofedCart.body.data.items.some(i => i.unit_price === 68.00), 'Server ignores client-supplied price 0.01 and uses database price ₹68.00');

    // TEST 11: Strict Input Validation & Fuzzing
    console.log('\n[Phase 10: Strict Input Validation & Fuzzing]');
    const negativeQty = await request('POST', '/cart/items', { barcode: '8901234567890', quantity: -5 }, customerToken);
    assert(negativeQty.status === 400 && negativeQty.body.error.code === 'INVALID_QUANTITY', 'Negative quantity rejected with HTTP 400 INVALID_QUANTITY');

    const invalidBarcode = await request('GET', '/products/barcode/9999999999999');
    assert(invalidBarcode.status === 404 && invalidBarcode.body.error.code === 'PRODUCT_NOT_FOUND', 'Unknown barcode returns HTTP 404 PRODUCT_NOT_FOUND');

    // TEST 12: Concurrent Security Gate Verification (Simultaneous Scan)
    console.log('\n[Phase 11: Concurrent Security Gate Verification]');
    // Create & Pay a fresh order for concurrent verification test
    await request('POST', '/cart/items', { barcode: '8901234567890', quantity: 1 }, customerToken);
    const concurrentOrder = await request('POST', '/orders', {}, customerToken);
    const concurrentPay = await request('POST', '/payments/verify', { order_id: concurrentOrder.body.data.id }, customerToken);
    const concQrToken = concurrentPay.body.data.qr_pass.raw_token;

    // Send two verification requests simultaneously
    const [concRes1, concRes2] = await Promise.all([
      request('POST', '/security/verify', { token: concQrToken }, securityToken),
      request('POST', '/security/verify', { token: concQrToken }, securityToken)
    ]);

    const validCount = [concRes1, concRes2].filter(r => r.body.data && r.body.data.valid === true).length;
    const reexitedCount = [concRes1, concRes2].filter(r => r.body.data && r.body.data.already_exited === true).length;
    assert(validCount === 2 && reexitedCount >= 1, 'Simultaneous QR gate scans both succeed with re-verification tracking');

    // TEST 13: RBAC Role Escalation Prevention
    console.log('\n[Phase 12: RBAC Role Escalation Prevention]');
    const custAdminAttempt = await request('GET', '/admin/dashboard', null, customerToken);
    assert(custAdminAttempt.status === 403, 'Customer attempting Admin API blocked with HTTP 403 FORBIDDEN');

    const custSecurityAttempt = await request('POST', '/security/verify', { token: 'dummy' }, customerToken);
    assert(custSecurityAttempt.status === 403, 'Customer attempting Security Gate API blocked with HTTP 403 FORBIDDEN');

    const secAdminAttempt = await request('POST', '/admin/inventory/adjust', { product_id: 'f0000000-0000-0000-0000-000000000001', quantity: 10 }, securityToken);
    assert(secAdminAttempt.status === 403, 'Security Staff attempting Admin Inventory modification blocked with HTTP 403 FORBIDDEN');

    // TEST 14: Historical Bill Snapshot & Price Preservation
    console.log('\n[Phase 13: Historical Bill & Snapshot Preservation]');
    const historicalOrder = await request('GET', `/orders/${orderId}`, null, customerToken);
    const firstItem = historicalOrder.body.data.items[0];
    assert(firstItem && firstItem.unit_price === 68.00 && firstItem.product_name_snapshot.includes('Milk'), 'Historical bill preserves original price ₹68.00 snapshot');

    // TEST 15: Payment Refresh & Pass Retrieval Safety
    console.log('\n[Phase 14: Payment Refresh & QR Pass Retrieval Safety]');
    await request('POST', '/cart/items', { barcode: '8901234567890', quantity: 1 }, customerToken);
    const refreshOrder = await request('POST', '/orders', {}, customerToken);
    const refreshPay1 = await request('POST', '/payments/verify', { order_id: refreshOrder.body.data.id }, customerToken);
    assert(refreshPay1.status === 200 && refreshPay1.body.data.payment_status === 'SUCCESS', 'First payment verification succeeds for new order');

    const refreshPay2 = await request('POST', '/payments/verify', { order_id: refreshOrder.body.data.id }, customerToken);
    assert(refreshPay2.status === 200 && refreshPay2.body.data.payment_status === 'SUCCESS' && refreshPay2.body.data.qr_pass, 'Re-requesting pass for paid order returns valid pass without double charge');

    console.log(`\n=======================================================`);
    console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`=======================================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
  }
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

runTests();
