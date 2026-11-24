const {
  validateTripDates,
  computeBudgetSummary,
  categorizeTripStatus
} = require('../src/utils/tripBudgetValidator');

describe('Trip Budget & Date Validator (TDD Unit Tests)', () => {
  describe('validateTripDates()', () => {
    test('TDD-01: should return valid for nominal multi-day date range', () => {
      const result = validateTripDates('2026-12-01', '2026-12-07');
      expect(result.isValid).toBe(true);
      expect(result.durationDays).toBe(7);
      expect(result.error).toBeNull();
    });

    test('TDD-02: should return valid for single-day trip (start == end)', () => {
      const result = validateTripDates('2026-12-05', '2026-12-05');
      expect(result.isValid).toBe(true);
      expect(result.durationDays).toBe(1);
      expect(result.error).toBeNull();
    });

    test('TDD-03: should return error when dates are omitted or empty', () => {
      const result = validateTripDates('', '2026-12-05');
      expect(result.isValid).toBe(false);
      expect(result.durationDays).toBe(0);
      expect(result.error).toBe('Start date and end date are required.');
    });

    test('TDD-04: should return error for invalid date strings', () => {
      const result = validateTripDates('not-a-date', '2026-12-05');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format. Expected valid ISO date.');
    });

    test('TDD-05: should return error when start date is after end date', () => {
      const result = validateTripDates('2026-12-10', '2026-12-05');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Start date must be earlier than or equal to end date.');
    });

    test('TDD-06: should return error when duration exceeds 365 days limit', () => {
      const result = validateTripDates('2026-01-01', '2027-01-15');
      expect(result.isValid).toBe(false);
      expect(result.durationDays).toBe(380);
      expect(result.error).toBe('Trip duration cannot exceed 365 days.');
    });
  });

  describe('computeBudgetSummary()', () => {
    test('TDD-07: should accurately compute spent, remaining, and percentage under budget', () => {
      const expenses = [
        { amount: '150.50' },
        { amount: 49.50 },
        { amount: '100.00' }
      ];
      const result = computeBudgetSummary('1000.00', expenses);

      expect(result.budget).toBe(1000);
      expect(result.totalSpent).toBe(300);
      expect(result.remaining).toBe(700);
      expect(result.percentageUsed).toBe(30);
      expect(result.isOverBudget).toBe(false);
      expect(result.error).toBeNull();
    });

    test('TDD-08: should detect over-budget scenario when spending exceeds allocated budget', () => {
      const expenses = [
        { amount: 800 },
        { amount: 350 }
      ];
      const result = computeBudgetSummary(1000, expenses);

      expect(result.totalSpent).toBe(1150);
      expect(result.remaining).toBe(-150);
      expect(result.percentageUsed).toBe(115);
      expect(result.isOverBudget).toBe(true);
    });

    test('TDD-09: should reject negative budget with error', () => {
      const result = computeBudgetSummary(-500);
      expect(result.error).toBe('Budget must be a non-negative number.');
      expect(result.budget).toBe(0);
    });

    test('TDD-10: should handle zero budget gracefully without division by zero', () => {
      const result = computeBudgetSummary(0, []);
      expect(result.budget).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.percentageUsed).toBe(0);
      expect(result.isOverBudget).toBe(false);
    });

    test('TDD-11: should ignore non-numeric or negative expense items in calculation', () => {
      const expenses = [
        { amount: 100 },
        { amount: -50 }, // negative should be ignored
        { amount: 'invalid' }, // NaN should be ignored
        null,
        { amount: 200 }
      ];
      const result = computeBudgetSummary(500, expenses);
      expect(result.totalSpent).toBe(300);
      expect(result.remaining).toBe(200);
    });
  });

  describe('categorizeTripStatus()', () => {
    test('TDD-12: should categorize as UPCOMING when start date is in future', () => {
      const status = categorizeTripStatus('2028-06-01', '2028-06-10', '2028-01-01');
      expect(status).toBe('UPCOMING');
    });

    test('TDD-13: should categorize as ONGOING when reference date is within start and end date', () => {
      const status = categorizeTripStatus('2028-06-01', '2028-06-10', '2028-06-05');
      expect(status).toBe('ONGOING');
    });

    test('TDD-14: should categorize as COMPLETED when end date is in past', () => {
      const status = categorizeTripStatus('2028-06-01', '2028-06-10', '2028-07-01');
      expect(status).toBe('COMPLETED');
    });
  });
});
