const tripController = require('../src/controllers/tripController');
const db = require('../src/config/db');
const uploadToCloudinary = require('../src/utils/cloudinaryUpload');

jest.mock('../src/config/db', () => ({
  getConnection: jest.fn(),
  execute: jest.fn()
}));

jest.mock('../src/utils/cloudinaryUpload', () => jest.fn());

describe('Trip Controller Unit Tests (White-Box)', () => {
  let req, res, next, mockConnection;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn().mockResolvedValue(),
      execute: jest.fn().mockResolvedValue([{ insertId: 101 }])
    };

    db.getConnection.mockResolvedValue(mockConnection);
    db.execute.mockResolvedValue([[]]);

    req = {
      user: { id: 1, role: 'USER' },
      body: {},
      params: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('createTrip()', () => {
    test('Path 1: should return 400 and rollback when mandatory fields are missing', async () => {
      req.body = { title: '', country: 'Sri Lanka', startDate: '2026-12-01', endDate: '2026-12-05' };

      await tripController.createTrip(req, res, next);

      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Trip name, country, start date, and end date are required.'
      });
    });

    test('Path 2: should return 400 and rollback when startDate > endDate', async () => {
      req.body = {
        title: 'Inverted Trip',
        country: 'Japan',
        startDate: '2026-12-10',
        endDate: '2026-12-05'
      };

      await tripController.createTrip(req, res, next);

      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Start date must be earlier than or equal to end date.'
      });
    });

    test('Path 3: should return 400 and rollback when trip duration > 365 days', async () => {
      req.body = {
        title: 'Multi-Year Trip',
        country: 'Worldwide',
        startDate: '2026-01-01',
        endDate: '2027-01-10' // 375 days
      };

      await tripController.createTrip(req, res, next);

      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Trip duration cannot exceed 365 days.'
      });
    });

    test('Path 4: should create trip with "UPCOMING" status when dates are in the future', async () => {
      req.body = {
        title: 'Future Safari',
        country: 'Kenya',
        startDate: '2028-06-01',
        endDate: '2028-06-05',
        budget: '5000',
        currency: 'USD',
        travelersCount: '2'
      };

      await tripController.createTrip(req, res, next);

      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);

      const responseJson = res.json.mock.calls[0][0];
      expect(responseJson.success).toBe(true);
      expect(responseJson.data.status).toBe('UPCOMING');
      expect(responseJson.data.daysCount).toBe(5);
      expect(responseJson.data.coverPhoto).toBeNull();
    });

    test('Path 5: should create trip with "ONGOING" status when dates span today', async () => {
      const today = new Date().toISOString().split('T')[0];
      req.body = {
        title: 'Current Expedition',
        country: 'Sri Lanka',
        startDate: today,
        endDate: today
      };

      await tripController.createTrip(req, res, next);

      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].data.status).toBe('ONGOING');
      expect(res.json.mock.calls[0][0].data.daysCount).toBe(1);
    });

    test('Path 6: should create trip with "COMPLETED" status when dates are in the past', async () => {
      req.body = {
        title: 'Historic Tour',
        country: 'Italy',
        startDate: '2020-01-01',
        endDate: '2020-01-04'
      };

      await tripController.createTrip(req, res, next);

      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].data.status).toBe('COMPLETED');
      expect(res.json.mock.calls[0][0].data.daysCount).toBe(4);
    });

    test('Path 7: should upload cover photo to Cloudinary if req.file is present', async () => {
      uploadToCloudinary.mockResolvedValue({ url: 'https://cloudinary.com/test-cover.jpg' });

      req.body = {
        title: 'Alpine Hike',
        country: 'Switzerland',
        startDate: '2028-07-01',
        endDate: '2028-07-03'
      };
      req.file = { buffer: Buffer.from('fake-image-bytes') };

      await tripController.createTrip(req, res, next);

      expect(uploadToCloudinary).toHaveBeenCalledWith(expect.any(Buffer), 'covers');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].data.coverPhoto).toBe('https://cloudinary.com/test-cover.jpg');
    });

    test('Path 8: should catch database execution error, rollback, and call next(err)', async () => {
      req.body = {
        title: 'Error Trip',
        country: 'Iceland',
        startDate: '2028-08-01',
        endDate: '2028-08-03'
      };

      const dbError = new Error('Database connection lost');
      mockConnection.execute.mockRejectedValue(dbError);

      await tripController.createTrip(req, res, next);

      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.release).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('deleteTrip()', () => {
    test('should return 404 if trip does not exist', async () => {
      req.params.id = 999;
      db.execute.mockResolvedValue([[]]); // No trip found

      await tripController.deleteTrip(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Trip not found.' });
    });

    test('should return 403 if requester is not owner and not ADMIN', async () => {
      req.params.id = 5;
      req.user = { id: 2, role: 'USER' }; // Not owner
      db.execute.mockResolvedValue([[{ user_id: 1, title: 'Owner Trip' }]]);

      await tripController.deleteTrip(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only the trip owner can delete this trip.'
      });
    });

    test('should allow owner to delete trip and return 200', async () => {
      req.params.id = 5;
      req.user = { id: 1, role: 'USER' }; // Owner
      db.execute
        .mockResolvedValueOnce([[{ user_id: 1, title: 'Owner Trip' }]]) // SELECT
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

      await tripController.deleteTrip(req, res, next);

      expect(db.execute).toHaveBeenCalledWith('DELETE FROM trips WHERE id = ?', [5]);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Trip "Owner Trip" was deleted successfully.'
      });
    });

    test('should allow ADMIN to delete any trip even if not owner', async () => {
      req.params.id = 5;
      req.user = { id: 99, role: 'ADMIN' }; // Admin
      db.execute
        .mockResolvedValueOnce([[{ user_id: 1, title: 'User Trip' }]]) // SELECT
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

      await tripController.deleteTrip(req, res, next);

      expect(db.execute).toHaveBeenCalledWith('DELETE FROM trips WHERE id = ?', [5]);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Trip "User Trip" was deleted successfully.'
      });
    });

    test('should catch unexpected error and call next(err)', async () => {
      req.params.id = 5;
      const error = new Error('Unexpected deletion failure');
      db.execute.mockRejectedValue(error);

      await tripController.deleteTrip(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
