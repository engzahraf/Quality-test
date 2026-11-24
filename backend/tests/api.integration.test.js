const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'ci-test-secret-12345';

jest.mock('../src/config/db', () => ({
  execute: jest.fn(),
  getConnection: jest.fn()
}));

const app = require('../src/server');
const db = require('../src/config/db');

describe('Automated API Integration Tests (Supertest CI Suite)', () => {
  const jwtSecret = process.env.JWT_SECRET || '1234@1234@masd';

  beforeEach(() => {
    jest.clearAllMocks();
    db.execute.mockResolvedValue([[]]);
  });

  describe('GET /api/health (System Health Check)', () => {
    test('should return 200 and online status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('online');
      expect(res.body.app).toBe('Travel Planner & Live Travel Journal API');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/auth/register', () => {
    test('should reject registration with missing fields with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: '', email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Username, name, email, and password are required.');
    });

    test('should reject registration with invalid email format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'valid_user',
          name: 'Valid User',
          email: 'not-an-email',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please provide a valid email address.');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should reject login when credentials are missing with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Please provide both email (or username) and password.');
    });

    test('should return 401 when user is not found in database', async () => {
      db.execute.mockResolvedValueOnce([[]]); // No matching user

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email/username or password.');
    });
  });

  describe('Protected Routes & Authorization', () => {
    test('should block GET /api/trips without Authorization header with 401', async () => {
      const res = await request(app).get('/api/trips');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token required.');
    });

    test('should block GET /api/admin/stats for regular USER role with 403', async () => {
      const userToken = jwt.sign(
        { userId: 2, role: 'USER' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      // Return normal user whenever users table is queried
      db.execute.mockImplementation(async (query) => {
        if (query.includes('FROM users WHERE id = ?')) {
          return [[{ id: 2, username: 'normal_traveler', role: 'USER', is_active: 1 }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access denied. Administrator privileges required.');
    });

    test('should allow GET /api/admin/stats for ADMIN role with 200', async () => {
      const adminToken = jwt.sign(
        { userId: 1, role: 'ADMIN' },
        jwtSecret,
        { expiresIn: '1h' }
      );

      // Return admin user and statistics metrics
      db.execute.mockImplementation(async (query) => {
        if (query.includes('FROM users WHERE id = ?')) {
          return [[{ id: 1, username: 'admin_user', role: 'ADMIN', is_active: 1 }]];
        }
        if (query.includes('total_users') && query.includes('FROM users')) {
          return [[{ total_users: 10, active_users: 9, admin_users: 1 }]];
        }
        if (query.includes('total_trips') && query.includes('FROM trips')) {
          return [[{ total_trips: 25, ongoing_trips: 5, completed_trips: 15, upcoming_trips: 5 }]];
        }
        if (query.includes('FROM photos')) {
          return [[{ total_photos: 42 }]];
        }
        if (query.includes('FROM expenses')) {
          return [[{ total_expenses_amount: 150000, total_expenses_count: 30 }]];
        }
        if (query.includes('FROM destinations')) {
          return [[{ total_destinations: 60 }]];
        }
        if (query.includes('GROUP BY country')) {
          return [[{ country: 'Sri Lanka', trip_count: 10 }]];
        }
        return [[]];
      });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.total_users).toBe(10);
      expect(res.body.data.trips.total_trips).toBe(25);
      expect(res.body.data.photos).toBe(42);
      expect(res.body.data.destinations).toBe(60);
    });
  });

  describe('Global 404 Route Handling', () => {
    test('should return standardized JSON 404 for undefined endpoints', async () => {
      const res = await request(app).get('/unknown-service-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Resource not found: GET /unknown-service-route');
    });
  });
});
