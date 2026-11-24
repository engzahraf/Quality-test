Feature: Trip Management & Financial Planning
  As an authenticated traveler
  I want to plan multi-day trips with valid date ranges and budget tracking
  So that I can organize my journey itineraries and manage expenditures effectively

  Background:
    Given the travel planning system is initialized

  Scenario: Successfully plan a multi-day trip with valid dates and budget
    Given a traveler provides a trip title "Explore Ella & Kandy" and country "Sri Lanka"
    And the traveler specifies a start date of "2026-12-01" and an end date of "2026-12-07"
    And the traveler allocates a budget of 250000 in "LKR"
    When the traveler submits the trip planning request
    Then the trip should be accepted with status "UPCOMING"
    And the calculated duration should be 7 days
    And the remaining budget should be 250000

  Scenario: Reject trip creation when start date is after end date
    Given a traveler provides a trip title "Inverted Journey" and country "Japan"
    And the traveler specifies a start date of "2026-12-10" and an end date of "2026-12-05"
    When the traveler submits the trip planning request
    Then the trip request should be rejected with an error "Start date must be earlier than or equal to end date."

  Scenario: Reject trip creation when duration exceeds maximum threshold
    Given a traveler provides a trip title "World Odyssey" and country "Worldwide"
    And the traveler specifies a start date of "2026-01-01" and an end date of "2027-01-15"
    When the traveler submits the trip planning request
    Then the trip request should be rejected with an error "Trip duration cannot exceed 365 days."

  Scenario: Successfully record an expense within the allocated trip budget
    Given an existing trip with an allocated budget of 50000 in "LKR"
    When the trip owner logs an expense titled "Train tickets" of 4500 in category "Transport"
    Then the expense should be recorded successfully
    And the updated total spent should be 4500
    And the remaining trip budget should be 45500
    And the over-budget alert should be false

  Scenario: Alert traveler when total expenses exceed allocated trip budget
    Given an existing trip with an allocated budget of 10000 in "LKR"
    When the trip owner logs an expense titled "Luxury Resort" of 12500 in category "Accommodation"
    Then the expense should be recorded successfully
    And the updated total spent should be 12500
    And the remaining trip budget should be -2500
    And the over-budget alert should be true

  Scenario: Block unauthenticated request when token is missing
    Given an unauthenticated request without an authorization header
    When the client attempts to access trip details
    Then the access should be denied with HTTP status 401 and message "Authentication token required."

  Scenario: Forbid non-owner from recording expenses on private trips
    Given a private trip owned by user 1
    When user 2 attempts to record an expense of 1500 on that trip
    Then the operation should be forbidden with message "Only the trip owner can record expenses."
