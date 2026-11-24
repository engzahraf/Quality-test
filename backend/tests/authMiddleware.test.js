const jwt = require('jsonwebtoken');
const db = require('../src/config/db');
const { authenticate, requireAdmin } = require('../src/middlewares/authMiddleware');

jest.mock('../src/config/db', () => ({
  execute: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

describe('Auth Middleware Unit Tests (White-Box)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('authenticate()', () => {
    test('Branch 1: should return 401 if authorization header is missing', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication token required.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Branch 2: should return 401 if authorization header does not start with "Bearer "', async () => {
      req.headers.authorization = 'Basic token123';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication token required.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Branch 3: should return 401 if JWT verification throws error (expired/tampered)', async () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Branch 4: should return 401 if decoded user is not found in database', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ userId: 999 });
      db.execute.mockResolvedValue([[]]); // empty rows

      await authenticate(req, res, next);

      expect(db.execute).toHaveBeenCalledWith(expect.any(String), [999]);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid user token or user not found.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Branch 5: should return 403 if user account is deactivated (is_active === 0)', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ userId: 10 });
      db.execute.mockResolvedValue([[{ id: 10, username: 'inactive_user', is_active: 0 }]]);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Branch 6: should set req.user and call next() for active authenticated user', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ userId: 1 });
      const mockUser = { id: 1, username: 'active_traveler', role: 'USER', is_active: 1 };
      db.execute.mockResolvedValue([[mockUser]]);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin()', () => {
    test('Branch 7: should return 403 if req.user is undefined', () => {
      req.user = undefined;

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Administrator privileges required.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Branch 8: should return 403 if req.user.role is not "ADMIN"', () => {
      req.user = { id: 2, role: 'USER' };

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Administrator privileges required.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('Branch 9: should call next() if req.user.role is "ADMIN"', () => {
      req.user = { id: 1, role: 'ADMIN' };

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
