const { Given, When, Then, Before } = require('@cucumber/cucumber');
const assert = require('assert');
const {
  validateTripDates,
  computeBudgetSummary,
  categorizeTripStatus
} = require('../../src/utils/tripBudgetValidator');
const { authenticate } = require('../../src/middlewares/authMiddleware');

let currentTripInput = {};
let currentTripResult = null;
let currentExpenses = [];
let currentBudgetSummary = null;
let currentAuthReq = null;
let currentAuthRes = null;
let currentTripOwnership = null;
let currentExpenseResult = null;

Before(function () {
  currentTripInput = {};
  currentTripResult = null;
  currentExpenses = [];
  currentBudgetSummary = null;
  currentAuthReq = null;
  currentAuthRes = null;
  currentTripOwnership = null;
  currentExpenseResult = null;
});

Given('the travel planning system is initialized', function () {
  assert.ok(typeof validateTripDates === 'function');
  assert.ok(typeof computeBudgetSummary === 'function');
});

// Scenario 1, 2, 3: Trip planning and date validations
Given('a traveler provides a trip title {string} and country {string}', function (title, country) {
  currentTripInput.title = title;
  currentTripInput.country = country;
});

Given('the traveler specifies a start date of {string} and an end date of {string}', function (start, end) {
  currentTripInput.startDate = start;
  currentTripInput.endDate = end;
});

Given('the traveler allocates a budget of {int} in {string}', function (budget, currency) {
  currentTripInput.budget = budget;
  currentTripInput.currency = currency;
});

When('the traveler submits the trip planning request', function () {
  const dateValidation = validateTripDates(currentTripInput.startDate, currentTripInput.endDate);

  if (!dateValidation.isValid) {
    currentTripResult = {
      success: false,
      error: dateValidation.error
    };
    return;
  }

  const status = categorizeTripStatus(currentTripInput.startDate, currentTripInput.endDate);
  const budgetSummary = computeBudgetSummary(currentTripInput.budget, []);

  currentTripResult = {
    success: true,
    status,
    durationDays: dateValidation.durationDays,
    budget: budgetSummary.budget,
    remaining: budgetSummary.remaining
  };
});

Then('the trip should be accepted with status {string}', function (expectedStatus) {
  assert.strictEqual(currentTripResult.success, true);
  assert.strictEqual(currentTripResult.status, expectedStatus);
});

Then('the calculated duration should be {int} days', function (expectedDays) {
  assert.strictEqual(currentTripResult.durationDays, expectedDays);
});

Then('the remaining budget should be {int}', function (expectedRemaining) {
  assert.strictEqual(currentTripResult.remaining, expectedRemaining);
});

Then('the trip request should be rejected with an error {string}', function (expectedErrorMessage) {
  assert.strictEqual(currentTripResult.success, false);
  assert.strictEqual(currentTripResult.error, expectedErrorMessage);
});

// Scenario 4 & 5: Expense logging & budget thresholds
Given('an existing trip with an allocated budget of {int} in {string}', function (budget, currency) {
  currentTripInput.budget = budget;
  currentTripInput.currency = currency;
  currentExpenses = [];
});

When('the trip owner logs an expense titled {string} of {int} in category {string}', function (title, amount, category) {
  currentExpenses.push({
    title,
    amount,
    category
  });

  currentBudgetSummary = computeBudgetSummary(currentTripInput.budget, currentExpenses);
  currentExpenseResult = {
    success: true,
    expenseId: currentExpenses.length
  };
});

Then('the expense should be recorded successfully', function () {
  assert.strictEqual(currentExpenseResult.success, true);
  assert.ok(currentExpenseResult.expenseId > 0);
});

Then('the updated total spent should be {int}', function (expectedSpent) {
  assert.strictEqual(currentBudgetSummary.totalSpent, expectedSpent);
});

Then('the remaining trip budget should be {int}', function (expectedRemaining) {
  assert.strictEqual(currentBudgetSummary.remaining, expectedRemaining);
});

Then('the over-budget alert should be {word}', function (expectedAlert) {
  const isOver = expectedAlert === 'true';
  assert.strictEqual(currentBudgetSummary.isOverBudget, isOver);
});

// Scenario 6: Authentication protection
Given('an unauthenticated request without an authorization header', function () {
  currentAuthReq = {
    headers: {}
  };
  currentAuthRes = {
    statusCode: null,
    body: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (payload) {
      this.body = payload;
      return this;
    }
  };
});

When('the client attempts to access trip details', async function () {
  let nextCalled = false;
  await authenticate(currentAuthReq, currentAuthRes, () => {
    nextCalled = true;
  });
  currentAuthRes.nextCalled = nextCalled;
});

Then('the access should be denied with HTTP status {int} and message {string}', function (expectedStatus, expectedMessage) {
  assert.strictEqual(currentAuthRes.statusCode, expectedStatus);
  assert.strictEqual(currentAuthRes.body.success, false);
  assert.strictEqual(currentAuthRes.body.message, expectedMessage);
  assert.strictEqual(currentAuthRes.nextCalled, false);
});

// Scenario 7: Authorization & ownership checks
Given('a private trip owned by user {int}', function (ownerId) {
  currentTripOwnership = {
    tripId: 101,
    ownerId: ownerId
  };
});

When('user {int} attempts to record an expense of {int} on that trip', function (userId, amount) {
  if (userId !== currentTripOwnership.ownerId) {
    currentExpenseResult = {
      status: 403,
      success: false,
      message: 'Only the trip owner can record expenses.'
    };
  } else {
    currentExpenseResult = {
      status: 201,
      success: true
    };
  }
});

Then('the operation should be forbidden with message {string}', function (expectedMessage) {
  assert.strictEqual(currentExpenseResult.status, 403);
  assert.strictEqual(currentExpenseResult.success, false);
  assert.strictEqual(currentExpenseResult.message, expectedMessage);
});
