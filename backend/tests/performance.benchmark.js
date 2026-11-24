/**
 * EC4206 Section 3.7 - Performance & Load Benchmark Suite
 * Evaluates throughput, concurrency, and latency percentiles (min, avg, p95, max)
 * across key application endpoints under load without external database dependencies.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'ci-perf-security-secret-key-12345';

const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Intercept MySQL database pool before requiring server
const db = require('../src/config/db');

const mockPassword = 'TestPassword123!';
let mockHashedPassword = '';

const app = require('../src/server');

// Helper to calculate percentiles
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

// Low-level HTTP request dispatcher
function makeRequest(serverUrl, options, postData) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const url = new URL(options.path, serverUrl);

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (postData) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1e6;
        resolve({
          statusCode: res.statusCode,
          latencyMs,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });

    req.on('error', () => {
      const end = process.hrtime.bigint();
      resolve({
        statusCode: 0,
        latencyMs: Number(end - start) / 1e6,
        success: false
      });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

// Worker pool workload executor
async function runWorkload(serverUrl, scenario, totalRequests, concurrency) {
  const latencies = [];
  let successCount = 0;
  let errorCount = 0;

  const workloadStart = process.hrtime.bigint();
  let remaining = totalRequests;

  async function worker() {
    while (remaining > 0) {
      remaining--;
      const res = await makeRequest(serverUrl, scenario.request, scenario.body);
      latencies.push(res.latencyMs);
      if (res.success || (scenario.expectedStatus && res.statusCode === scenario.expectedStatus)) {
        successCount++;
      } else {
        errorCount++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const workloadEnd = process.hrtime.bigint();
  const totalDurationSec = Number(workloadEnd - workloadStart) / 1e9;
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = latencies.length ? sum / latencies.length : 0;
  const min = latencies.length ? Math.min(...latencies) : 0;
  const max = latencies.length ? Math.max(...latencies) : 0;
  const p95 = percentile(latencies, 95);
  const rps = totalDurationSec > 0 ? (totalRequests / totalDurationSec) : 0;

  return {
    endpoint: scenario.name,
    requests: totalRequests,
    concurrency,
    success: successCount,
    errors: errorCount,
    minMs: min.toFixed(2),
    avgMs: avg.toFixed(2),
    p95Ms: p95.toFixed(2),
    maxMs: max.toFixed(2),
    rps: rps.toFixed(1)
  };
}

async function startBenchmark() {
  console.log('\n========================================================================================');
  console.log('       EC4206 Section 3.7: Automated Performance & Load Benchmark Suite                ');
  console.log('========================================================================================');
  console.log(`Environment: NODE_ENV=${process.env.NODE_ENV} | Runtime: Node.js ${process.version}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  mockHashedPassword = await bcrypt.hash(mockPassword, 10);

  // Setup mock database implementation for benchmark endpoints
  db.execute = async (query, params) => {
    // Auth user check
    if (query.includes('WHERE email = ? OR username = ?') || (query.includes('FROM users') && query.includes('email = ?'))) {
      return [[{
        id: 1,
        username: 'perf_user',
        name: 'Performance Tester',
        email: 'perf@travelplanner.local',
        password: mockHashedPassword,
        role: 'USER',
        is_active: 1,
        email_verified: 1
      }]];
    }
    // Auth token verification
    if (query.includes('FROM users WHERE id = ?')) {
      const isParamAdmin = params && params[0] === 999;
      return [[{
        id: isParamAdmin ? 999 : 1,
        username: isParamAdmin ? 'admin_tester' : 'perf_user',
        name: isParamAdmin ? 'Admin Tester' : 'Performance Tester',
        email: isParamAdmin ? 'admin@perf.local' : 'perf@travelplanner.local',
        role: isParamAdmin ? 'ADMIN' : 'USER',
        is_active: 1
      }]];
    }
    // Trips list
    if (query.includes('FROM trips')) {
      if (query.includes('total_trips')) {
        return [[{ total_trips: 50, ongoing_trips: 10, completed_trips: 30, upcoming_trips: 10 }]];
      }
      return [[
        { id: 101, title: 'Trip to Alps', country: 'Switzerland', status: 'ONGOING', total_spent: 1200, budget: 3000 },
        { id: 102, title: 'Kyoto Journey', country: 'Japan', status: 'UPCOMING', total_spent: 0, budget: 4500 }
      ]];
    }
    // Admin stats
    if (query.includes('FROM photos')) return [[{ total_photos: 120 }]];
    if (query.includes('FROM expenses')) return [[{ total_expenses_amount: 350000, total_expenses_count: 85 }]];
    if (query.includes('FROM destinations')) return [[{ total_destinations: 240 }]];
    if (query.includes('GROUP BY country')) return [[{ country: 'Japan', trip_count: 12 }]];
    if (query.includes('total_users')) return [[{ total_users: 25, active_users: 24, admin_users: 1 }]];

    return [[]];
  };

  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: async () => {},
    execute: async () => [{ insertId: 101 }]
  });

  // Start in-memory HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;
  console.log(`Ephemeral Test Server listening on: ${serverUrl}\n`);

  // Generate tokens
  const userToken = jwt.sign({ userId: 1, role: 'USER' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const adminToken = jwt.sign({ userId: 999, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Test scenarios
  const scenarios = [
    {
      name: 'GET /api/health (System Baseline)',
      request: { path: '/api/health', method: 'GET' },
      body: null,
      requests: 200,
      concurrency: 15
    },
    {
      name: 'POST /api/auth/login (Auth & Crypto)',
      request: { path: '/api/auth/login', method: 'POST' },
      body: JSON.stringify({ email: 'perf@travelplanner.local', password: mockPassword }),
      requests: 100,
      concurrency: 10
    },
    {
      name: 'GET /api/trips (JWT Protected)',
      request: {
        path: '/api/trips',
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` }
      },
      body: null,
      requests: 150,
      concurrency: 12
    },
    {
      name: 'GET /api/admin/stats (Admin Aggregation)',
      request: {
        path: '/api/admin/stats',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` }
      },
      body: null,
      requests: 100,
      concurrency: 10
    },
    {
      name: 'GET /api/unknown (404 Fast Path)',
      request: { path: '/unknown-route-performance', method: 'GET' },
      body: null,
      expectedStatus: 404,
      requests: 200,
      concurrency: 15
    }
  ];

  const results = [];

  for (const scenario of scenarios) {
    process.stdout.write(`Executing benchmark: ${scenario.name} (${scenario.requests} reqs, c=${scenario.concurrency})... `);
    const result = await runWorkload(serverUrl, scenario, scenario.requests, scenario.concurrency);
    results.push(result);
    console.log(`Done! [avg=${result.avgMs}ms, p95=${result.p95Ms}ms, ${result.rps} req/s]`);
  }

  // Print results table
  console.log('\n===================================================================================================================');
  console.log('| Endpoint & Workload                    | Reqs | Conc | Success | Fail | Min(ms) | Avg(ms) | P95(ms) | Max(ms) | RPS   |');
  console.log('===================================================================================================================');
  for (const r of results) {
    const pad = (str, len) => String(str).padEnd(len, ' ');
    const padNum = (num, len) => String(num).padStart(len, ' ');

    console.log(
      `| ${pad(r.endpoint, 38)} ` +
      `| ${padNum(r.requests, 4)} ` +
      `| ${padNum(r.concurrency, 4)} ` +
      `| ${padNum(r.success, 7)} ` +
      `| ${padNum(r.errors, 4)} ` +
      `| ${padNum(r.minMs, 7)} ` +
      `| ${padNum(r.avgMs, 7)} ` +
      `| ${padNum(r.p95Ms, 7)} ` +
      `| ${padNum(r.maxMs, 7)} ` +
      `| ${padNum(r.rps, 5)} |`
    );
  }
  console.log('===================================================================================================================\n');

  // Verify SLAs
  const allPassed = results.every(r => {
    if (r.endpoint.includes('/api/auth/login')) {
      return r.errors === 0 && Number(r.avgMs) < 1000; // Account for intentional bcrypt key stretching
    }
    return r.errors === 0 && Number(r.avgMs) < 100;
  });
  if (allPassed) {
    console.log('✅ ALL PERFORMANCE BENCHMARKS PASSED (Zero errors, sub-100ms API latency, and sub-1000ms bcrypt auth latency).\n');
  } else {
    console.warn('⚠️ Some performance thresholds exceeded defined SLA.\n');
  }

  server.close(() => {
    process.exit(allPassed ? 0 : 1);
  });
}

startBenchmark().catch((err) => {
  console.error('Fatal benchmark execution error:', err);
  process.exit(1);
});
