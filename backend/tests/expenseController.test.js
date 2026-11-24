const expenseController = require('../src/controllers/expenseController');
const db = require('../src/config/db');

jest.mock('../src/config/db', () => ({
  execute: jest.fn()
}));

describe('Expense Controller Unit Tests (White-Box)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { tripId: '1' },
      user: { id: 1, role: 'USER' },
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('addExpense()', () => {
    test('Path 1: should return 404 if trip does not exist', async () => {
      db.execute.mockResolvedValueOnce([[]]); // checkTripAccess returns no trips

      await expenseController.addExpense(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Trip not found.' });
    });

    test('Path 2: should return 403 if user is not trip owner and not ADMIN', async () => {
      req.user = { id: 2, role: 'USER' }; // not owner
      db.execute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1, budget: 1000, currency: 'USD' }]]) // trips
        .mockResolvedValueOnce([[]]); // trip_shares

      await expenseController.addExpense(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Only the trip owner can record expenses.'
      });
    });

    test('Path 3: should return 400 when title, amount, or expenseDate are missing', async () => {
      db.execute.mockResolvedValueOnce([[{ id: 1, user_id: 1, budget: 1000, currency: 'USD' }]]);

      req.body = { title: '', amount: 50, expenseDate: '2026-12-02' };

      await expenseController.addExpense(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Title, amount, and date are required.'
      });
    });

    test('Path 4: should successfully insert expense without destinationId and return 201', async () => {
      db.execute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1, budget: 1000, currency: 'USD' }]]) // trip access
        .mockResolvedValueOnce([{ insertId: 55 }]); // INSERT into expenses

      req.body = {
        title: 'Train Ticket',
        amount: 25.5,
        category: 'Transport',
        expenseDate: '2026-12-02',
        notes: 'Express train'
      };

      await expenseController.addExpense(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Expense added successfully.',
        data: { expenseId: 55 }
      });
    });

    test('Path 5: should insert expense with destinationId and update actual_cost', async () => {
      db.execute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1, budget: 1000, currency: 'USD' }]]) // trip access
        .mockResolvedValueOnce([{ insertId: 56 }]) // INSERT expense
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE destinations

      req.body = {
        title: 'Museum Entry',
        amount: 15.0,
        category: 'Entrance Fees',
        expenseDate: '2026-12-02',
        destinationId: 12
      };

      await expenseController.addExpense(req, res, next);

      expect(db.execute).toHaveBeenCalledTimes(3);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Expense added successfully.',
        data: { expenseId: 56 }
      });
    });

    test('Path 6: should catch database error and call next(err)', async () => {
      const error = new Error('Database query failure');
      db.execute.mockRejectedValue(error);

      await expenseController.addExpense(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getExpensesByTrip()', () => {
    test('should return 404 if trip does not exist', async () => {
      db.execute.mockResolvedValueOnce([[]]); // checkTripAccess

      await expenseController.getExpensesByTrip(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Trip not found.' });
    });

    test('should return 403 if user is not owner, not shared, and not admin', async () => {
      req.user = { id: 3, role: 'USER' };
      db.execute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1, budget: 500, currency: 'USD' }]]) // trips
        .mockResolvedValueOnce([[]]); // trip_shares

      await expenseController.getExpensesByTrip(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Access denied.' });
    });

    test('should return 200 with expenses and computed summary for owner', async () => {
      req.user = { id: 1, role: 'USER' };
      const mockExpenses = [{ id: 1, amount: 100, category: 'Food' }];
      const mockSummary = [{ total_spent: '100', category: 'Food', count: 1 }];

      db.execute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1, budget: '500', currency: 'USD' }]]) // trips
        .mockResolvedValueOnce([mockExpenses]) // expenses query
        .mockResolvedValueOnce([mockSummary]); // summary query

      await expenseController.getExpensesByTrip(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          currency: 'USD',
          budget: 500,
          totalSpent: 100,
          remaining: 400,
          categoryBreakdown: mockSummary,
          expenses: mockExpenses
        }
      });
    });

    test('should catch unexpected error and call next(err)', async () => {
      const error = new Error('Get expenses error');
      db.execute.mockRejectedValue(error);

      await expenseController.getExpensesByTrip(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
