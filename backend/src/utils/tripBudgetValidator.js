/**
 * Trip Budget and Date Validator Utility (TDD Demonstration Module)
 * Provides date logic validation, budget summary calculations, and status categorization.
 */

/**
 * Validates trip dates and computes duration in days.
 * @param {string} startDateStr - ISO start date string (YYYY-MM-DD)
 * @param {string} endDateStr - ISO end date string (YYYY-MM-DD)
 * @param {number} [maxDays=365] - Maximum permitted duration
 * @returns {{ isValid: boolean, durationDays: number, error: string|null }}
 */
function validateTripDates(startDateStr, endDateStr, maxDays = 365) {
  if (!startDateStr || !endDateStr) {
    return {
      isValid: false,
      durationDays: 0,
      error: 'Start date and end date are required.'
    };
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      durationDays: 0,
      error: 'Invalid date format. Expected valid ISO date.'
    };
  }

  if (start > end) {
    return {
      isValid: false,
      durationDays: 0,
      error: 'Start date must be earlier than or equal to end date.'
    };
  }

  const diffTime = end.getTime() - start.getTime();
  const durationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (durationDays > maxDays) {
    return {
      isValid: false,
      durationDays,
      error: `Trip duration cannot exceed ${maxDays} days.`
    };
  }

  return {
    isValid: true,
    durationDays,
    error: null
  };
}

/**
 * Computes budget summary metrics including remaining balance, percentage used, and over-budget flag.
 * @param {number|string} budget - Total allocated trip budget
 * @param {Array<{ amount: number|string }>} [expenses=[]] - List of recorded expense items
 * @returns {{ budget: number, totalSpent: number, remaining: number, percentageUsed: number, isOverBudget: boolean, error: string|null }}
 */
function computeBudgetSummary(budget, expenses = []) {
  const parsedBudget = parseFloat(budget);

  if (isNaN(parsedBudget) || parsedBudget < 0) {
    return {
      budget: 0,
      totalSpent: 0,
      remaining: 0,
      percentageUsed: 0,
      isOverBudget: false,
      error: 'Budget must be a non-negative number.'
    };
  }

  const totalSpent = (Array.isArray(expenses) ? expenses : []).reduce((acc, item) => {
    const val = parseFloat(item && item.amount);
    return acc + (!isNaN(val) && val > 0 ? val : 0);
  }, 0);

  const roundedBudget = Math.round(parsedBudget * 100) / 100;
  const roundedSpent = Math.round(totalSpent * 100) / 100;
  const remaining = Math.round((roundedBudget - roundedSpent) * 100) / 100;

  const percentageUsed = roundedBudget > 0
    ? Math.round((roundedSpent / roundedBudget) * 10000) / 100
    : (roundedSpent > 0 ? 100 : 0);

  return {
    budget: roundedBudget,
    totalSpent: roundedSpent,
    remaining,
    percentageUsed,
    isOverBudget: roundedSpent > roundedBudget,
    error: null
  };
}

/**
 * Determines trip lifecycle status relative to a reference date (defaults to today).
 * @param {string} startDateStr - ISO start date string
 * @param {string} endDateStr - ISO end date string
 * @param {string} [referenceDateStr] - Optional ISO reference date
 * @returns {'UPCOMING'|'ONGOING'|'COMPLETED'}
 */
function categorizeTripStatus(startDateStr, endDateStr, referenceDateStr) {
  const refDate = referenceDateStr
    ? new Date(referenceDateStr).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  if (startDateStr <= refDate && endDateStr >= refDate) {
    return 'ONGOING';
  } else if (endDateStr < refDate) {
    return 'COMPLETED';
  } else {
    return 'UPCOMING';
  }
}

module.exports = {
  validateTripDates,
  computeBudgetSummary,
  categorizeTripStatus
};
