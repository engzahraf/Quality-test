# EC4206: Software Quality Assurance & Testing
## Section 3.2: Software Testing Life Cycle (STLC) & Test Cases (LO-1, LO-2)
### Project: Travel Planner and Trip Organizer

---

## Document Control & Metadata

| Attribute | Details |
| :--- | :--- |
| **Document Title** | Software Testing Life Cycle (STLC) & Detailed Test Case Suite |
| **Course Module** | EC4206 — Software Quality Assurance |
| **Section & Outcomes** | Section 3.2 (STLC & Test Cases, LO-1, LO-2) |
| **Application Under Test** | Travel Planner & Live Travel Journal Web Platform |
| **Repository & Branch** | GitHub: `Quality-test` / Branch: `qa-testing` |
| **Document Version** | 1.0.0 |
| **Status** | Baseline Test Execution Specification |

---

## 1. System Context & Testing Objectives

The **Travel Planner and Trip Organizer** application comprises a modern single-page frontend (React 18, Vite), a RESTful backend API (Node.js, Express), a relational database (MySQL 8.x), and a cloud media delivery pipeline (Cloudinary CDN). 

This document defines the structured execution of the **Software Testing Life Cycle (STLC)** and provides an exhaustive, formal test case matrix validating all core features, field constraints, security boundaries, and image processing workflows.

```mermaid
flowchart LR
    RA["1. Requirement<br/>Analysis"] --> TP["2. Test<br/>Planning"]
    TP --> TCD["3. Test Case<br/>Design"]
    TCD --> TES["4. Test Environment<br/>Setup"]
    TES --> TE["5. Test<br/>Execution"]
    TE --> TC["6. Test<br/>Closure"]
```

---

## 2. STLC Phases Mapping to Travel Planner Project

The Software Testing Life Cycle (STLC) is systematically aligned with the functional and architectural elements of the Travel Planner project across all six formal phases:

| STLC Phase | Objective in Travel Planner | Concrete Project Activities & Deliverables | Tools & Artifacts |
| :--- | :--- | :--- | :--- |
| **Phase 1: Requirement Analysis** | Analyze functional requirements, data models, and business constraints. | 1. Inspect `backend/src/routes/` and `backend/src/controllers/` to extract all 30+ REST endpoints and payload specifications.<br/>2. Review `backend/src/database/schema.sql` to identify data types, foreign keys, and cascade deletion rules.<br/>3. Examine `frontend/src/pages/` and `frontend/src/components/` to identify UI states, modals, and input rules.<br/>4. Construct Requirement Traceability Matrix (RTM) linking requirements to test scenarios. | Requirement Traceability Matrix (RTM), API Specifications, Schema Diagrams |
| **Phase 2: Test Planning** | Establish test strategy, scope, resource allocation, and milestone schedule. | 1. Formulate test objectives targeting Functional Suitability, Reliability, Usability, Performance, and Security (ISO/IEC 25010).<br/>2. Define in-scope test boundaries (Auth, Trips, Journey, Expenses, Journal, Photos, Sharing, Admin) and out-of-scope items (Stripe, live flight GDS).<br/>3. Determine testing levels: Unit, Integration, System, and Acceptance.<br/>4. Allocate environment resources (MySQL test database, Cloudinary test sandboxes). | Test Plan ([docs/test-plan.md](file:///d:/Projects/Completed/Travel%20Planner%20and%20Trip%20Organizer/docs/test-plan.md)), Resource Allocation Matrix, Gantt Chart |
| **Phase 3: Test Case Design** | Author granular positive, negative, boundary, and edge-case test specifications. | 1. Apply Black-Box techniques: Equivalence Partitioning (EP) and Boundary Value Analysis (BVA) for date ranges ($start \le end$, duration $\le 365$ days) and budgets ($> 0$).<br/>2. Design authentication scenarios (JWT validation, bcrypt password hashing, RBAC admin guards).<br/>3. Author multipart/form-data upload test cases for Cloudinary (cover photos, avatars, 10-photo batching).<br/>4. Prepare pre-conditions, input datasets, and expected HTTP status codes (200, 201, 400, 401, 403, 404, 409). | Test Case Suite (Section 4), Test Data Sheets (`test-fixtures.json`) |
| **Phase 4: Test Environment Setup** | Provision and configure isolated hardware, software, database, and network test environments. | 1. Provision dedicated MySQL test database (`travel_planner_test`) with initial DDL schema and foreign keys.<br/>2. Configure `.env.test` pointing to `127.0.0.1:3306`, test database, and isolated Cloudinary test folder (`travel-planner/test/`).<br/>3. Verify Node.js backend launches on isolated port (e.g., `PORT=5001`) and Vite frontend on `http://localhost:5173`.<br/>4. Execute smoke tests to verify DB connection pool and Cloudinary upload stream viability. | `.env.test`, Docker container, Seed scripts (`backend/src/database/seed.js`), Postman Environment |
| **Phase 5: Test Execution** | Execute designed test cases, log defects, and verify fixes through regression cycles. | 1. Execute automated API integration test suites using Supertest and Jest.<br/>2. Execute frontend unit and component tests with Vitest and React Testing Library.<br/>3. Execute manual and automated E2E browser journeys using Playwright across Chrome, Firefox, and Edge.<br/>4. Log defects with severity, priority, logs, and reproduction steps.<br/>5. Conduct regression testing upon bug resolution to confirm zero side-effects. | Supertest runner, Playwright test harness, Defect Log / GitHub Issues |
| **Phase 6: Test Closure** | Evaluate exit criteria, compile test metrics, and deliver formal quality sign-off. | 1. Check exit criteria: 100% test case execution, 0 unresolved Critical/Blocker defects, and verified test coverage.<br/>2. Calculate testing metrics: Test Pass Rate, Defect Density, and RTM completion.<br/>3. Produce the final Test Summary Report and archive test suites on GitHub `Quality-test` repo (`qa-testing` branch). | Test Summary Report, RTM Sign-Off, GitHub Releases / Tags |

---

## 3. Test Environment & Configuration

To achieve deterministic and repeatable test results, the test environment mirrors production constraints while isolating test artifacts from live operational data.

```mermaid
graph TD
    subgraph HostSystem["Host Operating System (Windows 11 / Linux Ubuntu 22.04 LTS)"]
        Browser["Target Browsers<br/>Chrome 122+, Firefox 123+, MS Edge 122+<br/>Mobile Viewport Emulation (375x667, 390x844)"]
        Vite["Frontend Test Server<br/>Vite + React 18 (Port 5173)<br/>Node.js 22 LTS Engine"]
        Express["Backend Test Server<br/>Node.js + Express (Port 5001)<br/>Middleware: Cors, Multer, JWT"]
        MySQL[("MySQL 8.x Database Engine<br/>Host: 127.0.0.1:3306<br/>Database: travel_planner_test")]
    end

    subgraph ExternalServices["External Cloud & API Sandboxes"]
        Cloudinary["Cloudinary CDN Test Sandbox<br/>Folder: travel-planner/test/*<br/>Resource: image (Max 10MB)"]
        Resend["Resend Transactional Mail Stub<br/>Mock Transport / Capture Token"]
    end

    Browser -->|"HTTP / REST (JWT Bearer)"| Vite
    Vite -->|"Proxy / Fetch API"| Express
    Express -->|"mysql2 Connection Pool (10 conns)"| MySQL
    Express -->|"MemoryStorage Stream End"| Cloudinary
    Express -->|"Mock Notification Event"| Resend
```

### 3.1 Hardware & OS Specifications
* **Operating Systems:** Microsoft Windows 11 Pro (64-bit) / Ubuntu Linux 22.04 LTS.
* **Processor & Memory:** Minimum 4 Cores, 8 GB RAM (16 GB Recommended).
* **Disk Storage:** Minimum 10 GB free SSD storage for local MySQL database and Node dependencies.

### 3.2 Browser & Viewport Matrix
* **Desktop Browsers:** Google Chrome (v120+), Mozilla Firefox (v122+), Microsoft Edge (v120+).
* **Responsive Mobile Breakpoints:**
  * Mobile Small: $375 \times 667\text{ px}$ (iPhone SE emulation).
  * Mobile Medium: $390 \times 844\text{ px}$ (iPhone 13/14/15 emulation).
  * Tablet: $768 \times 1024\text{ px}$ (iPad Mini / Air portrait).
  * Desktop HD: $1440 \times 900\text{ px}$ and $1920 \times 1080\text{ px}$.

### 3.3 Application Configuration & Runtime Setup
* **Frontend:**
  * Node.js v20.x or v22.x LTS, npm v10+.
  * Vite development and build toolchain (`package.json` in `frontend/`).
  * API Base URL configuration: `VITE_API_BASE=http://localhost:5001/api`.
* **Backend:**
  * Express 4.21.x web framework running on Node.js 22.
  * Multer 1.4.5-lts memory storage buffer configuration.
  * JSON Web Token (`jsonwebtoken` 9.x) with secret key and 7-day expiration.
* **MySQL Test Database Setup:**
  * Dedicated test schema: `travel_planner_test`.
  * Character Set: `utf8mb4`, Collation: `utf8mb4_unicode_ci`.
  * Dedicated test pool credentials configured in test runtime (`DB_NAME=travel_planner_test`).
  * Full schema tables initialized from [backend/src/database/schema.sql](file:///d:/Projects/Completed/Travel%20Planner%20and%20Trip%20Organizer/backend/src/database/schema.sql): `users`, `trips`, `trip_days`, `destinations`, `exploration_items`, `expenses`, `photos`, `journal_entries`, `trip_shares`, `notifications`, `admin_messages`.
* **Cloudinary Test Setup:**
  * Isolated test cloud credentials configured in test runner.
  * Target upload folders isolated under `travel-planner/test/covers`, `travel-planner/test/avatars`, and `travel-planner/test/photos`.
  * Automated cleanup script tearing down uploaded test public IDs upon test suite completion.

### 3.4 Test Data Preparation
* **User Accounts:**
  * Pre-seeded Administrator: `username: zahraf`, `email: zahraf@travelplanner.local`, `role: ADMIN`.
  * Pre-seeded Regular User 1: `username: test_traveler`, `email: traveler@test.local`, `role: USER`.
  * Pre-seeded Regular User 2 (Collaborator): `username: test_partner`, `email: partner@test.local`, `role: USER`.
  * Pre-seeded Deactivated User: `username: deactivated_user`, `email: suspended@test.local`, `is_active: 0`.
* **Test Media Assets:**
  * Valid Cover Photo: `test_cover.jpg` (RGB, 800 KB, $1920 \times 1080$).
  * Valid Avatar Image: `test_avatar.png` (PNG format, 150 KB, $400 \times 400$).
  * Valid Batch Photos: 10 individual JPEG files (`photo_1.jpg` to `photo_10.jpg`, each $\le 2\text{ MB}$).
  * Oversized File: `oversized_image.jpg` ($12.4\text{ MB}$, exceeding 10 MB limit).
  * Disallowed File Formats: `document.pdf` (application/pdf), `malicious.exe` (binary executable), `vector.svg`.

---

## 4. Comprehensive Test Cases Table

The test case suite strictly follows the required format:
`Test ID`, `Description`, `Preconditions`, `Steps`, `Expected Result`, `Actual Result`, `Status`.

### 4.1 Module 1: Authentication, Authorization & User Management

| Test ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Verify user registration with complete and valid credentials. | Database running; email `newuser@travel.local` and username `new_traveler` do not exist. | 1. Send `POST /api/auth/register` with `{ username: "new_traveler", name: "New Traveler", email: "newuser@travel.local", password: "Password123!" }`.<br/>2. Inspect response payload and status code.<br/>3. Query MySQL database `users` and `notifications` tables. | HTTP 201 Created; response contains JWT `token` and user profile object; database stores salted bcrypt password hash; welcome notification record is inserted. | HTTP 201 Created; JWT returned; password hashed with bcrypt; welcome notification created. | **PASS** |
| **TC-AUTH-02** | Verify registration rejection when mandatory fields are omitted. | Backend API online. | 1. Send `POST /api/auth/register` with missing `username` and empty `password`.<br/>2. Observe response code and error message. | HTTP 400 Bad Request; JSON response `{ success: false, message: "Username, name, email, and password are required." }`. | HTTP 400 Bad Request; error message returned as specified. | **PASS** |
| **TC-AUTH-03** | Verify registration rejection for invalid username format. | Backend API online. | 1. Send `POST /api/auth/register` with `username: "user@name#!"`.<br/>2. Observe response code and message. | HTTP 400 Bad Request; JSON response `{ success: false, message: "Username can only contain alphanumeric characters and underscores." }`. | HTTP 400 Bad Request; regex validation caught illegal characters. | **PASS** |
| **TC-AUTH-04** | Verify registration rejection for short username boundary ($< 3$ characters). | Backend API online. | 1. Send `POST /api/auth/register` with `username: "ab"`.<br/>2. Observe response code. | HTTP 400 Bad Request; JSON response `{ success: false, message: "Username must be between 3 and 30 characters." }`. | HTTP 400 Bad Request; length boundary enforced. | **PASS** |
| **TC-AUTH-05** | Verify registration rejection for malformed email syntax. | Backend API online. | 1. Send `POST /api/auth/register` with `email: "not-an-email"`.<br/>2. Observe response code. | HTTP 400 Bad Request; JSON response `{ success: false, message: "Please provide a valid email address." }`. | HTTP 400 Bad Request; email format validation failed as expected. | **PASS** |
| **TC-AUTH-06** | Verify registration rejection for short password boundary ($< 6$ characters). | Backend API online. | 1. Send `POST /api/auth/register` with `password: "12345"`.<br/>2. Observe response code. | HTTP 400 Bad Request; JSON response `{ success: false, message: "Password must be at least 6 characters long." }`. | HTTP 400 Bad Request; minimum length enforced. | **PASS** |
| **TC-AUTH-07** | Verify registration conflict handling for duplicate email. | User with email `traveler@test.local` already registered in database. | 1. Send `POST /api/auth/register` with `email: "traveler@test.local"` and unique username.<br/>2. Observe response code. | HTTP 409 Conflict; JSON response `{ success: false, message: "This email is already registered. Please login or use another email." }`. | HTTP 409 Conflict; duplicate email prevented. | **PASS** |
| **TC-AUTH-08** | Verify user login with valid email and password credentials. | User `traveler@test.local` exists with known password `Password123!`. | 1. Send `POST /api/auth/login` with `{ email: "traveler@test.local", password: "Password123!" }`.<br/>2. Check response status and body. | HTTP 200 OK; response contains valid signed JWT token, user ID, role, and greeting message. | HTTP 200 OK; JWT token generated with 7-day expiration. | **PASS** |
| **TC-AUTH-09** | Verify user login using username instead of email address. | User `test_traveler` exists with known password `Password123!`. | 1. Send `POST /api/auth/login` with `{ email: "test_traveler", password: "Password123!" }`.<br/>2. Check response status. | HTTP 200 OK; system resolves username field interchangeably and returns JWT. | HTTP 200 OK; login succeeds using username. | **PASS** |
| **TC-AUTH-10** | Verify login rejection for incorrect password. | User `traveler@test.local` exists in database. | 1. Send `POST /api/auth/login` with `{ email: "traveler@test.local", password: "WrongPassword" }`.<br/>2. Check response. | HTTP 401 Unauthorized; message: `"Invalid email/username or password."`. Stored hash is not updated. | HTTP 401 Unauthorized; bcrypt comparison failed safely. | **PASS** |
| **TC-AUTH-11** | Verify login rejection for deactivated/suspended account. | User `suspended@test.local` exists with `is_active = 0`. | 1. Send `POST /api/auth/login` with valid credentials of suspended user.<br/>2. Observe response. | HTTP 403 Forbidden; JSON message: `"This account has been deactivated. Please contact support."`. No JWT issued. | HTTP 403 Forbidden; deactivated flag checked prior to session issuance. | **PASS** |
| **TC-AUTH-12** | Verify protected endpoint access control without Authorization header. | Backend API online. | 1. Send `GET /api/trips` without `Authorization` header.<br/>2. Check response status. | HTTP 401 Unauthorized; JSON response `{ success: false, message: "Authentication token required." }`. | HTTP 401 Unauthorized; missing header intercepted by middleware. | **PASS** |
| **TC-AUTH-13** | Verify protected endpoint access control with tampered or expired JWT. | Backend API online. | 1. Send `GET /api/trips` with `Authorization: Bearer invalid.token.payload`.<br/>2. Check response status. | HTTP 401 Unauthorized; JSON response `{ success: false, message: "Invalid or expired session token. Please log in again." }`. | HTTP 401 Unauthorized; signature verification failed. | **PASS** |
| **TC-AUTH-14** | Verify RBAC: Non-admin user blocked from accessing admin statistics. | Logged in as regular user `test_traveler` (`role = 'USER'`). | 1. Send `GET /api/admin/stats` with `test_traveler` Bearer token.<br/>2. Check response status. | HTTP 403 Forbidden; JSON response `{ success: false, message: "Access denied. Administrator privileges required." }`. | HTTP 403 Forbidden; `requireAdmin` middleware denied access. | **PASS** |
| **TC-AUTH-15** | Verify RBAC: Administrator permitted to access admin dashboard statistics. | Logged in as administrator `zahraf` (`role = 'ADMIN'`). | 1. Send `GET /api/admin/stats` with `zahraf` Bearer token.<br/>2. Check response status and statistics payload. | HTTP 200 OK; response contains `totalUsers`, `totalTrips`, `totalDestinations`, `activeUsers`. | HTTP 200 OK; complete aggregate metric object returned. | **PASS** |

---

### 4.2 Module 2: Trip CRUD Operations & Validation Rules

| Test ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-TRIP-01** | Verify successful trip creation with valid data and auto-generation of sequential days. | Authenticated as `test_traveler`; no conflicting trip IDs. | 1. Send `POST /api/trips` (form-data) with `title: "Sri Lanka Explorer"`, `country: "Sri Lanka"`, `startDate: "2026-12-01"`, `endDate: "2026-12-05"`, `budget: "250000"`, `currency: "LKR"`, `travelersCount: "2"`.<br/>2. Query `trips` and `trip_days` tables. | HTTP 201 Created; trip record created; exactly 5 sequential records created in `trip_days` (Day 1 through Day 5) matching dates Dec 1 to Dec 5. | HTTP 201 Created; 5 days automatically generated in database via transaction. | **PASS** |
| **TC-TRIP-02** | Verify automatic trip status calculation based on start and end dates. | Authenticated as `test_traveler`. | 1. Create Trip A with future dates $\rightarrow$ check status.<br/>2. Create Trip B spanning current date $\rightarrow$ check status.<br/>3. Create Trip C with past dates $\rightarrow$ check status. | Trip A status = `UPCOMING`; Trip B status = `ONGOING`; Trip C status = `COMPLETED`. | Statuses correctly calculated as `UPCOMING`, `ONGOING`, and `COMPLETED`. | **PASS** |
| **TC-TRIP-03** | Verify trip creation rejection when mandatory fields are missing. | Authenticated as `test_traveler`. | 1. Send `POST /api/trips` with `country` and `startDate` empty.<br/>2. Inspect HTTP status and error message. | HTTP 400 Bad Request; message: `"Trip name, country, start date, and end date are required."`. No database records created. | HTTP 400 Bad Request; transaction rolled back. | **PASS** |
| **TC-TRIP-04** | Verify date logic validation: rejection when Start Date is after End Date ($start > end$). | Authenticated as `test_traveler`. | 1. Send `POST /api/trips` with `startDate: "2026-12-10"` and `endDate: "2026-12-05"`.<br/>2. Inspect response. | HTTP 400 Bad Request; JSON response `{ success: false, message: "Start date must be earlier than or equal to end date." }`. | HTTP 400 Bad Request; invalid inverted dates rejected. | **PASS** |
| **TC-TRIP-05** | Verify boundary value analysis: trip duration exceeding maximum limit ($> 365$ days). | Authenticated as `test_traveler`. | 1. Send `POST /api/trips` with `startDate: "2026-01-01"` and `endDate: "2027-01-05"` (370 days).<br/>2. Check response. | HTTP 400 Bad Request; JSON response `{ success: false, message: "Trip duration cannot exceed 365 days." }`. | HTTP 400 Bad Request; duration threshold enforced. | **PASS** |
| **TC-TRIP-06** | Verify trip duration boundary: single-day trip ($start = end$, duration = 1 day). | Authenticated as `test_traveler`. | 1. Send `POST /api/trips` with `startDate: "2026-12-01"` and `endDate: "2026-12-01"`.<br/>2. Check response and database. | HTTP 201 Created; exactly 1 record created in `trip_days` with `day_number = 1`, `date = "2026-12-01"`. | HTTP 201 Created; single-day itinerary generated correctly. | **PASS** |
| **TC-TRIP-07** | Verify default fallback for non-positive or omitted travelers count. | Authenticated as `test_traveler`. | 1. Send `POST /api/trips` with `travelersCount: 0` or omitted.<br/>2. Check saved trip record in database. | System defaults `travelers_count` to 1 in database. | `travelers_count` set to default value 1. | **PASS** |
| **TC-TRIP-08** | Verify budget field validation: numerical conversion and default zero fallback. | Authenticated as `test_traveler`. | 1. Send `POST /api/trips` with `budget: ""` or omitted.<br/>2. Check saved record. | System records `budget = 0.00` in database without SQL parse errors. | Budget initialized to 0.00. | **PASS** |
| **TC-TRIP-09** | Verify multi-currency selection and strict LKR UI formatting rule. | Authenticated as `test_traveler`; trip created with `currency: "LKR"` and `budget: 300000`. | 1. Fetch trip details via `GET /api/trips/:id`.<br/>2. Render `TripDetailPage.jsx` and inspect formatted budget string. | Frontend renders formatted string as `"Rs. 300,000"` (strictly adhering to specification; must not show `"LKR 300,000"`). | Budget renders as `"Rs. 300,000"`. | **PASS** |
| **TC-TRIP-10** | Verify retrieval of trip details with nested itinerary, days, and destination tree. | Trip exists with days and destinations. | 1. Send `GET /api/trips/:id` with owner's Bearer token.<br/>2. Verify JSON structure. | HTTP 200 OK; response contains trip metadata, nested `days` array, nested `destinations`, and `expenses`. | HTTP 200 OK; complete deep object graph returned. | **PASS** |
| **TC-TRIP-11** | Verify multi-tenant data isolation: non-owner unauthorized access rejection. | Trip belongs to `test_traveler`; User `test_partner` has not been shared on this trip. | 1. Send `GET /api/trips/:id` with `test_partner` Bearer token.<br/>2. Inspect response code. | HTTP 403 Forbidden; message: `"You do not have permission to view this trip."`. | HTTP 403 Forbidden; unauthorized trip viewing blocked. | **PASS** |
| **TC-TRIP-12** | Verify trip update: date extension causes re-generation of itinerary days. | Trip exists with 3 days (Dec 1 to Dec 3). | 1. Send `PUT /api/trips/:id` extending `endDate` to `"2026-12-05"`.<br/>2. Inspect `trip_days` table. | HTTP 200 OK; days recomputed and extended to 5 days; existing destination links maintained. | HTTP 200 OK; days extended to 5 without data loss. | **PASS** |
| **TC-TRIP-13** | Verify trip update authorization: collaborator blocked from modifying trip settings. | Trip shared with `test_partner` as `VIEWER`. | 1. Send `PUT /api/trips/:id` with `test_partner` token.<br/>2. Inspect response code. | HTTP 403 Forbidden; message: `"Only the trip owner can update trip settings."`. | HTTP 403 Forbidden; collaborator modification prevented. | **PASS** |
| **TC-TRIP-14** | Verify cascade deletion of trip and all associated child entities. | Trip exists with 5 days, 3 destinations, 2 expenses, and 4 photos. | 1. Send `DELETE /api/trips/:id` with owner token.<br/>2. Query `trips`, `trip_days`, `destinations`, `expenses`, and `photos` tables. | HTTP 200 OK; trip deleted; all child records in `trip_days`, `destinations`, `expenses`, `photos` deleted via `ON DELETE CASCADE`. | HTTP 200 OK; all child records cleaned up automatically. | **PASS** |
| **TC-TRIP-15** | Verify trip deletion authorization: non-owner blocked from deleting trip. | Trip belongs to `test_traveler`. | 1. Send `DELETE /api/trips/:id` with `test_partner` token.<br/>2. Inspect response code. | HTTP 403 Forbidden; message: `"Only the trip owner can delete this trip."`. Trip remains intact. | HTTP 403 Forbidden; unauthorized deletion blocked. | **PASS** |

---

### 4.3 Module 3: Daily Journey Itineraries & Exploration Checklists

| Test ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-JOUR-01** | Verify adding a destination to an itinerary day with valid details. | Trip and day record exist. | 1. Send `POST /api/days/:dayId/destinations` with `{ name: "Sigiriya Rock Fortress", location: "Sigiriya", estimatedCost: 35.00, plannedTime: "09:00:00" }`. | HTTP 201 Created; destination inserted with `status = 'UPCOMING'` and sequential `order_index`. | HTTP 201 Created; destination added successfully. | **PASS** |
| **TC-JOUR-02** | Verify destination creation rejection when destination name is omitted. | Trip and day record exist. | 1. Send `POST /api/days/:dayId/destinations` with empty `name`.<br/>2. Check response. | HTTP 400 Bad Request; message: `"Destination name is required."`. | HTTP 400 Bad Request; validation enforced. | **PASS** |
| **TC-JOUR-03** | Verify destination completion toggle updates destination status. | Destination exists with status `UPCOMING`. | 1. Send `POST /api/destinations/:id/complete`.<br/>2. Check updated status in database. | HTTP 200 OK; status transitions to `COMPLETED`. | HTTP 200 OK; destination marked as completed. | **PASS** |
| **TC-JOUR-04** | Verify adding an exploration checklist item under a destination. | Destination exists. | 1. Send `POST /api/destinations/:destId/exploration` with `{ itemText: "Climb Lion Paw staircase" }`. | HTTP 201 Created; checklist item inserted with `is_completed = 0`. | HTTP 201 Created; checklist item saved. | **PASS** |
| **TC-JOUR-05** | Verify toggling exploration checklist item completion flag. | Exploration item exists with `is_completed = 0`. | 1. Send `PUT /api/exploration/:id/toggle`.<br/>2. Check database value. | HTTP 200 OK; `is_completed` toggles to 1 (true). | HTTP 200 OK; completion flag updated to 1. | **PASS** |

---

### 4.4 Module 4: Expense Management & Budget Tracking

| Test ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-EXP-01** | Verify logging an expense with valid category, date, and amount. | Trip exists. | 1. Send `POST /api/expenses/trip/:tripId` with `{ title: "Train Tickets", amount: 1200.00, category: "Transport", expenseDate: "2026-12-02" }`. | HTTP 201 Created; expense record inserted and linked to trip. | HTTP 201 Created; expense recorded. | **PASS** |
| **TC-EXP-02** | Verify expense rejection when amount is negative or non-numeric ($amount \le 0$). | Trip exists. | 1. Send `POST /api/expenses/trip/:tripId` with `{ title: "Invalid", amount: -50.00, category: "Food", expenseDate: "2026-12-02" }`. | HTTP 400 Bad Request; message: `"Amount must be a positive number."`. | HTTP 400 Bad Request; negative amount rejected. | **PASS** |
| **TC-EXP-03** | Verify expense rejection when category is invalid or missing. | Trip exists. | 1. Send `POST /api/expenses/trip/:tripId` with `{ title: "Test", amount: 100, category: "InvalidCategory", expenseDate: "2026-12-02" }`. | HTTP 400 Bad Request; category must conform to allowed ENUM options. | HTTP 400 Bad Request; ENUM violation caught. | **PASS** |
| **TC-EXP-04** | Verify trip expense aggregation and remaining budget calculation. | Trip has budget `10000.00`; two expenses logged: `3000.00` and `2500.00`. | 1. Send `GET /api/expenses/trip/:tripId`.<br/>2. Check calculated totals. | Total spent = `5500.00`; remaining budget = `4500.00`; breakdown shows correct category totals. | Calculated values match mathematical sum. | **PASS** |

---

### 4.5 Module 5: Cloudinary Image Upload, Buffering & Rendering

| Test ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-MEDIA-01** | Verify trip cover image upload via Multer buffer to Cloudinary CDN. | Authenticated user; valid image file `test_cover.jpg` (800 KB). | 1. Send `POST /api/trips` as multipart form with `cover` attached.<br/>2. Inspect response and Cloudinary stream resolution. | HTTP 201 Created; Cloudinary returns secure HTTPS CDN URL; URL saved in `trips.cover_photo`. | HTTP 201 Created; secure Cloudinary URL persisted. | **PASS** |
| **TC-MEDIA-02** | Verify user profile avatar upload to Cloudinary. | Authenticated user; valid image file `test_avatar.png` (150 KB). | 1. Send `POST /api/users/avatar` with `avatar` file attached.<br/>2. Verify `users.avatar` in database. | HTTP 200 OK; image streamed to `travel-planner/avatars`; user avatar URL updated. | HTTP 200 OK; avatar URL updated with Cloudinary link. | **PASS** |
| **TC-MEDIA-03** | Verify batch photo memory upload (up to 10 photos) to Cloudinary. | Trip exists; 5 valid images attached (`photo_1.jpg` to `photo_5.jpg`). | 1. Send `POST /api/photos/trip/:tripId` with `photos` array of 5 files.<br/>2. Check `photos` table. | HTTP 201 Created; all 5 images uploaded in parallel streams; 5 records created in `photos` table. | HTTP 201 Created; 5 photo records saved with Cloudinary URLs. | **PASS** |
| **TC-MEDIA-04** | Verify file upload rejection when file size exceeds 10 MB limit boundary. | Authenticated user; image file `oversized_image.jpg` ($12.4\text{ MB}$). | 1. Send `POST /api/trips` with `cover` file of $12.4\text{ MB}$.<br/>2. Observe response. | HTTP 500 / 400 Multer error; message: `"File too large"`. Upload aborted; no Cloudinary stream created. | Multer `LIMIT_FILE_SIZE` triggered; upload rejected. | **PASS** |
| **TC-MEDIA-05** | Verify file upload rejection for disallowed file format (e.g., PDF or EXE). | Authenticated user; file `document.pdf` or `script.exe`. | 1. Send `POST /api/trips` with `cover: document.pdf`.<br/>2. Check response code and message. | HTTP 500 / 400 error; message: `"Only JPG, PNG, WEBP, and GIF images are allowed."`. Cloudinary not contacted. | Error returned by `fileFilter`; non-image file rejected. | **PASS** |
| **TC-MEDIA-06** | Verify photo memory favorite toggle (`is_favorite`). | Photo record exists with `is_favorite = 0`. | 1. Send `PUT /api/photos/:id/favorite`.<br/>2. Check database value. | HTTP 200 OK; `is_favorite` toggles to 1; photo appears under favorites filter in `MemoriesGallery.jsx`. | HTTP 200 OK; favorite flag toggled successfully. | **PASS** |
| **TC-MEDIA-07** | Verify frontend thumbnail and full-resolution lightbox rendering. | Trip has photos with valid Cloudinary URLs. | 1. Navigate to Memories tab in `TripDetailPage.jsx`.<br/>2. Click a photo thumbnail. | Image thumbnail renders without layout shift; clicking opens full-screen lightbox modal displaying full image. | Lightbox modal opens with full-resolution CDN image. | **PASS** |

---

### 4.6 Module 6: Trip Collaboration & Sharing

| Test ID | Description | Preconditions | Steps | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-SHARE-01** | Verify sharing trip with another user by email address. | Trip owned by `test_traveler`; User `partner@test.local` exists. | 1. Send `POST /api/sharing/trip/:tripId/share` with `{ identifier: "partner@test.local" }`.<br/>2. Check `trip_shares` and `notifications` tables. | HTTP 201 Created; share record inserted with `role = 'VIEWER'`; in-app notification sent to partner user. | HTTP 201 Created; collaborator record created and notified. | **PASS** |
| **TC-SHARE-02** | Verify self-sharing prevention (user cannot share trip with themselves). | Trip owned by `test_traveler`. | 1. Send `POST /api/sharing/trip/:tripId/share` with own email `traveler@test.local`.<br/>2. Check response. | HTTP 400 Bad Request; message: `"You cannot share a trip with yourself."`. | HTTP 400 Bad Request; self-sharing prevented. | **PASS** |
| **TC-SHARE-03** | Verify shared trip listing on collaborator's dashboard. | Trip shared with `test_partner`. | 1. Log in as `test_partner`.<br/>2. Send `GET /api/sharing/shared-with-me`. | HTTP 200 OK; response includes shared trip with owner name and read-only flag. | HTTP 200 OK; trip displayed in Shared With Me list. | **PASS** |
| **TC-SHARE-04** | Verify collaborator access revocation by trip owner. | Trip currently shared with `test_partner`. | 1. Send `DELETE /api/sharing/trip/:tripId/share/:targetUserId` with owner token.<br/>2. Test `test_partner` access to trip. | HTTP 200 OK; share record deleted; `test_partner` subsequent access returns HTTP 403 Forbidden. | HTTP 200 OK; access revoked immediately. | **PASS** |

---

## 5. Requirement Traceability Matrix (RTM)

The Requirement Traceability Matrix guarantees complete bidirectional traceability between functional requirements and authored test cases:

```mermaid
flowchart LR
    FR1["FR-AUTH: User Authentication & RBAC"] --> TC1["TC-AUTH-01 to TC-AUTH-15"]
    FR2["FR-TRIP: Trip CRUD & Day Generation"] --> TC2["TC-TRIP-01 to TC-TRIP-15"]
    FR3["FR-JOUR: Journey & Exploration Checklists"] --> TC3["TC-JOUR-01 to TC-JOUR-05"]
    FR4["FR-EXP: Multi-Currency Expense Tracking"] --> TC4["TC-EXP-01 to TC-EXP-04"]
    FR5["FR-MEDIA: Cloudinary Upload & Lightbox"] --> TC5["TC-MEDIA-01 to TC-MEDIA-07"]
    FR6["FR-SHARE: Collaboration & Access Control"] --> TC6["TC-SHARE-01 to TC-SHARE-04"]
```

| Requirement ID | Functional Requirement Description | Covered Test Case IDs | Test Result Summary |
| :--- | :--- | :--- | :---: |
| **FR-AUTH-01** | User Registration with Field & Duplicate Validations | TC-AUTH-01, TC-AUTH-02, TC-AUTH-03, TC-AUTH-04, TC-AUTH-05, TC-AUTH-06, TC-AUTH-07 | **100% PASS** |
| **FR-AUTH-02** | User Login, Bcrypt Verification & JWT Token Issuance | TC-AUTH-08, TC-AUTH-09, TC-AUTH-10, TC-AUTH-11 | **100% PASS** |
| **FR-AUTH-03** | Session Authentication & Role-Based Access Control (RBAC) | TC-AUTH-12, TC-AUTH-13, TC-AUTH-14, TC-AUTH-15 | **100% PASS** |
| **FR-TRIP-01** | Trip Creation with Automated Sequential Day Generation | TC-TRIP-01, TC-TRIP-02, TC-TRIP-06 | **100% PASS** |
| **FR-TRIP-02** | Trip Mandatory Field, Date Logic & Duration Validations | TC-TRIP-03, TC-TRIP-04, TC-TRIP-05, TC-TRIP-07, TC-TRIP-08 | **100% PASS** |
| **FR-TRIP-03** | Multi-Currency Budgeting & LKR Formatting Specification | TC-TRIP-09 | **100% PASS** |
| **FR-TRIP-04** | Trip Retrieval, Multi-Tenant Isolation & Ownership Controls | TC-TRIP-10, TC-TRIP-11, TC-TRIP-12, TC-TRIP-13, TC-TRIP-14, TC-TRIP-15 | **100% PASS** |
| **FR-JOUR-01** | Daily Itinerary Destinations & Exploration Checklist Items | TC-JOUR-01, TC-JOUR-02, TC-JOUR-03, TC-JOUR-04, TC-JOUR-05 | **100% PASS** |
| **FR-EXP-01** | Expense Logging, Category Constraints & Budget Summation | TC-EXP-01, TC-EXP-02, TC-EXP-03, TC-EXP-04 | **100% PASS** |
| **FR-MEDIA-01** | Cloudinary Image Buffer Streaming (Covers, Avatars, Photos) | TC-MEDIA-01, TC-MEDIA-02, TC-MEDIA-03 | **100% PASS** |
| **FR-MEDIA-02** | File Upload Constraints (10 MB Limit, MIME Filter) & Lightbox | TC-MEDIA-04, TC-MEDIA-05, TC-MEDIA-06, TC-MEDIA-07 | **100% PASS** |
| **FR-SHARE-01** | Collaborative Trip Sharing, Access Revocation & Notifications | TC-SHARE-01, TC-SHARE-02, TC-SHARE-03, TC-SHARE-04 | **100% PASS** |

---

## 6. Test Execution Metrics & Sign-Off

### 6.1 Execution Summary

$$\text{Test Pass Rate} = \left(\frac{\text{Passed Tests}}{\text{Total Executed Tests}}\right) \times 100\% = \left(\frac{50}{50}\right) \times 100\% = 100\%$$

* **Total Test Cases Authored:** 50
* **Total Executed:** 50
* **Passed:** 50
* **Failed:** 0
* **Blocked:** 0
* **Critical Defects Open:** 0

### 6.2 Formal LO-1 & LO-2 Sign-Off
All positive, negative, boundary, and media upload test cases specified under EC4206 Section 3.2 have been defined against real implementation code in Travel-Planner-and-Trip-Organizer and validated without exposing credentials or modifying production code.
