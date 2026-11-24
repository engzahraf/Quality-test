/**
 * EC4206 Section 3.7 - Security Testing & Vulnerability Audit Suite
 * Covers Authentication Bypass, Role-Based Access Control (RBAC),
 * Injection Mitigation (SQLi/XSS), Error Hygiene, and Sensitive Data Exposure.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'ci-security-audit-secret-key-12345';

jest.mock('../src/config/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}));

const app = require('../src/server');
const db = require('../src/config/db');

describe('EC4206 Security Testing & Vulnerability Audit', () => {
  const jwtSecret = process.env.JWT_SECRET;

  const validUserToken = jwt.sign(
    { userId: 10, role: 'USER' },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const validAdminToken = jwt.sign(
    { userId: 1, role: 'ADMIN' },
    jwtSecret,
    { expiresIn: '1h' }
  );

  const expiredToken = jwt.sign(
    { userId: 10, role: 'USER' },
    jwtSecret,
    { expiresIn: '-10s' } // Expired token
  );

  beforeEach(() => {
    jest.clearAllMocks();
    db.execute.mockResolvedValue([[]]);
  });

  describe('1. Authentication & Token Security (SEC-AUTH)', () => {
    const protectedRoutes = [
      { method: 'get', url: '/api/trips', label: 'Trip Management' },
      { method: 'get', url: '/api/users/profile', label: 'User Profile' },
      { method: 'get', url: '/api/expenses/trip/1', label: 'Trip Expenses' },
      { method: 'get', url: '/api/journal/trip/1', label: 'Trip Journal' },
      { method: 'get', url: '/api/photos/trip/1', label: 'Trip Photos' },
      { method: 'get', url: '/api/admin/stats', label: 'Admin Statistics' }
    ];

    test.each(protectedRoutes)(
      'SEC-AUTH-01: should reject unauthenticated request with 401 on $url ($label)',
      async ({ method, url }) => {
        const res = await request(app)[method](url);

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Authentication token required/i);
      }
    );

    test('SEC-AUTH-02: should reject forged or tampered JWT signatures with 401', async () => {
      const forgedToken = jwt.sign(
        { userId: 1, role: 'ADMIN' },
        'attacker-fake-private-secret-key-12345'
      );

      const res = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid or expired session token/i);
    });

    test('SEC-AUTH-03: should reject expired JWT tokens with 401', async () => {
      const res = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid or expired session token/i);
    });

    test('SEC-AUTH-04: should reject authorization headers without "Bearer " schema with 401', async () => {
      const res = await request(app)
        .get('/api/trips')
        .set('Authorization', `Basic ${validUserToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token required.');
    });
  });

  describe('2. Role-Based Access Control (RBAC) & Authorization (SEC-RBAC)', () => {
    test('SEC-RBAC-01: should forbid regular USER role from accessing admin metrics (/api/admin/stats) with 403', async () => {
      db.execute.mockImplementation(async (query) => {
        if (query.includes('FROM users WHERE id = ?')) {
          return [[{ id: 10, username: 'regular_user', role: 'USER', is_active: 1 }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${validUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Administrator privileges required/i);
    });

    test('SEC-RBAC-02: should allow authenticated ADMIN role to access admin statistics with 200', async () => {
      db.execute.mockImplementation(async (query) => {
        if (query.includes('FROM users WHERE id = ?')) {
          return [[{ id: 1, username: 'admin_master', role: 'ADMIN', is_active: 1 }]];
        }
        if (query.includes('total_users') && query.includes('FROM users')) {
          return [[{ total_users: 15, active_users: 14, admin_users: 1 }]];
        }
        if (query.includes('total_trips') && query.includes('FROM trips')) {
          return [[{ total_trips: 40, ongoing_trips: 8, completed_trips: 22, upcoming_trips: 10 }]];
        }
        if (query.includes('FROM photos')) return [[{ total_photos: 95 }]];
        if (query.includes('FROM expenses')) return [[{ total_expenses_amount: 520000, total_expenses_count: 65 }]];
        if (query.includes('FROM destinations')) return [[{ total_destinations: 140 }]];
        if (query.includes('GROUP BY country')) return [[{ country: 'Switzerland', trip_count: 8 }]];
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${validAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.total_users).toBe(15);
    });

    test('SEC-RBAC-03: should immediately revoke access with 403 if user account is deactivated (is_active = 0)', async () => {
      db.execute.mockImplementation(async (query) => {
        if (query.includes('FROM users WHERE id = ?')) {
          return [[{ id: 10, username: 'banned_user', role: 'USER', is_active: 0 }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${validUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/account has been deactivated/i);
    });
  });

  describe('3. Injection Mitigation & Input Sanitization (SEC-INJ)', () => {
    test('SEC-INJ-01: should safely handle SQL injection strings in auth login without crashing or 500 error', async () => {
      // Simulate parameterized query execution: SQLi string is treated strictly as literal data parameter
      db.execute.mockImplementation(async (query, params) => {
        if (query.includes('FROM users WHERE email = ? OR username = ?')) {
          // SQL Injection payload passed in parameters should NOT match any user
          expect(params[0]).toBe("' OR '1'='1");
          expect(params[1]).toBe("' OR '1'='1");
          return [[]]; // No match
        }
        return [[]];
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: "' OR '1'='1",
          password: "' OR '1'='1"
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email/username or password.');
      expect(res.status).not.toBe(500);
    });

    test('SEC-INJ-02: should reject XSS script injection payloads in input fields with 400 Bad Request', async () => {
      const xssPayload = "<script>alert('XSS_ATTACK')</script>";

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: xssPayload,
          name: 'Security Auditor',
          email: 'auditor@example.com',
          password: 'Password123!'
        });

      // Validates application input regex rejects script tags safely without executing or crashing
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username can only contain letters, numbers, and underscores.');
    });

    test('SEC-INJ-03: should safely reject malformed non-JSON payload strings with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ "email": "malformed_json_missing_brace');

      expect(res.status).toBe(400);
      // Express bodyParser rejects bad syntax with clean 400
      expect(res.status).not.toBe(500);
    });
  });

  describe('4. Information Disclosure & Error Response Hygiene (SEC-INFO)', () => {
    test('SEC-INFO-01: should return standardized JSON 404 for nonexistent endpoints with no stack traces', async () => {
      const res = await request(app).get('/vulnerable-admin-database-dump');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Resource not found: GET /vulnerable-admin-database-dump');
      expect(res.body.stack).toBeUndefined();
    });

    test('SEC-INFO-02: should never leak server stack traces or internal secrets in non-development environments', async () => {
      // Trigger a 400 validation error
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/ci-security-audit-secret-key|\$2[abxy]\$|root_test_password/);
    });

    test('SEC-INFO-03: should expose standardized CORS headers on API endpoints', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toBeDefined();
    });
  });
});
