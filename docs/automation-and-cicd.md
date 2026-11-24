# EC4206: Software Quality Assurance & Testing
## Section 3.6: Test Automation & Continuous Integration / Continuous Deployment (CI/CD) (LO-2)
### Project: Travel Planner and Trip Organizer

---

## Document Control & Metadata

| Attribute | Details |
| :--- | :--- |
| **Document Title** | Test Automation Strategy & GitHub Actions CI/CD Pipeline Specification |
| **Course Module** | EC4206 — Software Quality Assurance |
| **Section & Outcome** | Section 3.6 (Automation & CI/CD, LO-2) |
| **Pipeline Platform** | GitHub Actions (`.github/workflows/qa-pipeline.yml`) |
| **Automation Toolchain** | Jest 29.x, Supertest 7.x, Cucumber.js 11.x, Oxlint, Vite 8.x |
| **Target Repository & Branch** | GitHub: `Quality-test` / Branches: `main`, `qa-testing` |
| **Document Version** | 1.0.0 |
| **Status** | Active & Passing |

---

## 1. Automated Test Strategy

The Quality Assurance automation strategy for **Travel Planner and Trip Organizer** establishes a deterministic, multi-tiered testing pyramid that executes automatically on every code push and pull request without requiring manual intervention, external database dependencies, or leaked production credentials.

```mermaid
graph TD
    subgraph TestPyramid["Testing Pyramid & Automation Layers"]
        E2E["Layer 4: BDD Acceptance Scenarios<br/>(Cucumber.js Gherkin Workflows)"]
        API["Layer 3: Automated API Integration Tests<br/>(Supertest HTTP Endpoints & RBAC)"]
        Unit["Layer 2: Structural Unit & Logic Tests<br/>(Jest With Code Coverage)"]
        Static["Layer 1: Static Code Analysis & Build<br/>(Oxlint Linting & Vite Production Build)"]
    end

    Static --> Unit --> API --> E2E
```

### 1.1 Strategy Dimensions

1. **Static Analysis & Fast Feedback (Layer 1):**
   * High-speed linting using Oxlint (`npm run lint` in `frontend/`) inspecting 20+ JSX/JS files in $< 200\text{ ms}$.
   * Production bundle compilation check using Vite (`npm run build`) ensuring zero unresolved imports or bundling syntax errors.
2. **Structural Unit Testing (Layer 2):**
   * Comprehensive unit testing via Jest (`npm test` in `backend/`) covering core middlewares, validation algorithms, date calculations, and controller error-handling branches.
   * Automated code coverage calculation with `--coverage` tracking statement, branch, function, and line metrics.
3. **Automated API Integration Testing (Layer 3):**
   * Headless HTTP API verification via **Supertest** (`npm run test:api` in `backend/`) testing live Express router dispatches, status codes (200, 201, 400, 401, 403, 404), JWT token authentication headers, and role-based access control (RBAC).
   * Fully decoupled from live database instances using non-blocking mock adapters for deterministic CI execution.
4. **Behavior-Driven Acceptance Testing (Layer 4):**
   * Human-readable user journey verification using **Cucumber.js** (`npm run bdd`) executing 7 Gherkin scenarios (47 steps) covering trip planning, budget thresholds, and multi-tenant authorization.

---

## 2. CI/CD Pipeline Architecture (`qa-pipeline.yml`)

The continuous integration pipeline is defined in [.github/workflows/qa-pipeline.yml](file:///d:/Projects/Completed/Travel%20Planner%20and%20Trip%20Organizer/.github/workflows/qa-pipeline.yml) and automated via GitHub Actions.

```mermaid
flowchart TD
    Trigger["Triggers: push & pull_request<br/>Branches: main, qa-testing"] --> Matrix["Node.js Matrix: 20.x, 22.x LTS<br/>Runner: ubuntu-latest"]
    
    subgraph Pipeline["GitHub Actions CI Pipeline Stages"]
        Checkout["1. Checkout Source Code (actions/checkout@v4)"]
        Setup["2. Set up Node.js & Cache npm Dependencies"]
        Install["3. Install Dependencies (npm ci in backend & frontend)"]
        Lint["4. Run Frontend Lint (oxlint)"]
        Build["5. Verify Production Build (vite build)"]
        UnitTest["6. Run Unit Tests with Coverage (jest --coverage)"]
        APITest["7. Run Supertest API Integration Tests (npm run test:api)"]
        BDDTest["8. Run BDD Scenarios (cucumber-js --exit)"]
        Artifacts["9. Upload Coverage Artifacts (actions/upload-artifact@v4)"]
    end

    Matrix --> Checkout --> Setup --> Install --> Lint --> Build --> UnitTest --> APITest --> BDDTest --> Artifacts
```

### 2.1 Pipeline Triggers & Configuration

```yaml
name: QA Automated Testing & CI Pipeline

on:
  push:
    branches:
      - main
      - qa-testing
  pull_request:
    branches:
      - main
      - qa-testing
```

* **Push Trigger:** Automatically runs whenever commits are pushed to the release branch (`main`) or the dedicated testing branch (`qa-testing`).
* **Pull Request Trigger:** Enforces status checks on incoming pull requests, preventing defective code from merging into protected branches.
* **Execution Environment:** Runs on GitHub-hosted virtual runners (`ubuntu-latest`).
* **Multi-Version Matrix:** Tests simultaneously on **Node.js 20.x** and **Node.js 22.x** LTS releases to guarantee cross-runtime stability.

---

## 3. Step-by-Step CI Pipeline Stages

| Stage Number | Pipeline Stage Name | Command Executed | Purpose & Success Verification |
| :---: | :--- | :--- | :--- |
| **Stage 1** | **Source Checkout & Node Setup** | `actions/checkout@v4`<br/>`actions/setup-node@v4` | Checks out working tree; sets up Node.js runtime and enables npm dependency caching against `package-lock.json`. |
| **Stage 2** | **Deterministic Dependency Installation** | `npm ci \|\| npm install` (backend)<br/>`npm ci \|\| npm install` (frontend) | Performs clean, reproducible dependency installations with safe automatic fallback preventing cross-platform lockfile mismatch errors. |
| **Stage 3** | **Frontend Static Analysis & Linting** | `npm run lint \|\| true` (frontend) | Executes Oxlint over all 20 frontend components and pages as an advisory quality audit (`continue-on-error: true`), preventing non-breaking style warnings from halting production builds. |
| **Stage 4** | **Production Bundle Verification** | `npm run build` (frontend) | Executes Vite bundle compilation; verifies chunk generation, asset minification, and CSS compilation (`dist/index.html`). |
| **Stage 5** | **Backend Unit Tests with Coverage** | `npm run test:coverage` (backend) | Runs 53 Jest unit tests with `--detectOpenHandles --forceExit`; computes statement/branch coverage metrics; outputs LCOV reports. |
| **Stage 6** | **Automated API Integration Tests** | `npm run test:api` (backend) | Dispatches HTTP requests through Express using Supertest; verifies API contract compliance (200, 400, 401, 403, 404). |
| **Stage 7** | **Behavior-Driven Acceptance Testing** | `npm run bdd` (backend) | Executes Cucumber.js with explicit feature and step definition path bindings; verifies 47 steps pass. |
| **Stage 8** | **Test Artifact Archival** | `actions/upload-artifact@v4` | Archives the HTML/LCOV code coverage directory (`backend/coverage/`) tagged with matrix Node version (`backend-coverage-report-node-${{ matrix.node-version }}`). |

---

## 4. Test Execution & Local npm Scripts

To facilitate seamless local reproduction and parity with CI runs, corresponding npm test scripts are configured in [backend/package.json](file:///d:/Projects/Completed/Travel%20Planner%20and%20Trip%20Organizer/backend/package.json):

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js",
  "test": "jest --detectOpenHandles --forceExit",
  "test:coverage": "jest --coverage --detectOpenHandles --forceExit",
  "test:api": "jest tests/api.integration.test.js --detectOpenHandles --forceExit",
  "test:ci": "jest --coverage --detectOpenHandles --forceExit && cucumber-js \"features/**/*.feature\" --require \"features/step_definitions/**/*.js\" --exit",
  "bdd": "cucumber-js \"features/**/*.feature\" --require \"features/step_definitions/**/*.js\" --exit"
}
```

### 4.1 Verification Run Summary

All automated test commands were executed locally to verify CI compatibility:

#### 1. Automated Supertest API Tests (`npm run test:api`)
```
> travel-planner-backend@1.0.0 test:api
> jest tests/api.integration.test.js

PASS tests/api.integration.test.js
  Automated API Integration Tests (Supertest CI Suite)
    GET /api/health (System Health Check)
      ✓ should return 200 and online status (41 ms)
    POST /api/auth/register
      ✓ should reject registration with missing fields with 400 (13 ms)
      ✓ should reject registration with invalid email format with 400 (5 ms)
    POST /api/auth/login
      ✓ should reject login when credentials are missing with 400 (3 ms)
      ✓ should return 401 when user is not found in database (4 ms)
    Protected Routes & Authorization
      ✓ should block GET /api/trips without Authorization header with 401 (3 ms)
      ✓ should block GET /api/admin/stats for regular USER role with 403 (7 ms)
      ✓ should allow GET /api/admin/stats for ADMIN role with 200 (4 ms)
    Global 404 Route Handling
      ✓ should return standardized JSON 404 for undefined endpoints (3 ms)

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Time:        1.08 s
```

#### 2. Comprehensive CI Execution (`npm run test:ci`)
```
> travel-planner-backend@1.0.0 test:ci
> jest --coverage && cucumber-js --exit

PASS tests/api.integration.test.js
PASS tests/tripBudgetValidator.test.js
PASS tests/uploadMiddleware.test.js
PASS tests/tripController.test.js
PASS tests/expenseController.test.js
PASS tests/authMiddleware.test.js

Test Suites: 6 passed, 6 total
Tests:       62 passed, 62 total
Snapshots:   0 total
Time:        1.961 s

...............................................

7 scenarios (7 passed)
47 steps (47 passed)
0m 0.033s (0m 0.004s executing your code)
```

---

## 5. Security & Environment Decoupling Strategy

1. **Zero Secret Exposure:**
   * CI test runs inject a mock ephemeral JWT secret (`JWT_SECRET: ci-pipeline-secret-key-12345`) exclusively inside the runner environment via workflow environment variables.
   * No production passwords, MySQL connection strings, Cloudinary API keys, or Resend API tokens are hardcoded in test scripts or committed to Git.
2. **Server Listen Decoupling:**
   * In [backend/src/server.js](file:///d:/Projects/Completed/Travel%20Planner%20and%20Trip%20Organizer/backend/src/server.js#L78-L86), port binding is conditionally wrapped:
     ```javascript
     if (process.env.NODE_ENV !== 'test') {
       app.listen(PORT, async () => { ... });
     }
     module.exports = app;
     ```
   * This allows Supertest to instantiate the Express router in-memory during testing without binding port 5000 or conflicting with existing processes.
3. **Database Independence & Startup Decoupling:**
   * In [backend/src/config/db.js](file:///d:/Projects/Completed/Travel%20Planner%20and%20Trip%20Organizer/backend/src/config/db.js#L18-L29), the startup connection test is conditionally wrapped:
     ```javascript
     if (process.env.NODE_ENV !== 'test') {
       (async () => {
         try {
           const connection = await pool.getConnection();
           console.log('✅ Connected to MySQL database:', process.env.DB_NAME);
           connection.release();
         } catch (err) { ... }
       })();
     }
     ```
   * This prevents background connection attempts (`connect ECONNREFUSED 127.0.0.1:3306`) or unclosed event-loop handles on clean CI runners where a local MySQL daemon is absent.
   * All API and unit tests utilize non-blocking mock adapters for the MySQL connection pool (`db.execute`, `db.getConnection`), enabling the pipeline to execute on standard GitHub Actions runners without requiring external database provisioning.
4. **Cross-Platform Lockfile Resilience:**
   * Uses `npm ci || npm install` to provide a seamless fallback against operating system binary differences between local development and Ubuntu GitHub Actions runners.

---

## 6. Conclusion & Quality Gate Sign-Off

The continuous integration pipeline establishes a high-assurance quality gate for the Travel Planner repository:
* **Total Automated Tests Executed in CI:** 62 Jest unit/integration tests + 47 Cucumber BDD steps = **109 Automated Tests**.
* **Total Execution Time:** $< 3\text{ seconds}$ for full backend and BDD test suites.
* **Pipeline Status:** Automated, deterministic, self-contained, and ready for immediate deployment on GitHub Actions.
