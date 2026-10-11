# ODTS — Order and Delivery Tracking System

Team 19 college project (Jira key **ODTS**).

Customers browse products, place orders and follow each delivery step by step. Administrators manage products, orders, delivery staff and reports. Delivery personnel update the status of the deliveries assigned to them.

> **Tracking type:** status-based delivery tracking (Order Placed → … → Delivered). There is **no live GPS tracking** in this prototype.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, plain CSS (responsive) |
| Backend | Node.js (20+), Express 4, REST API |
| Database | MongoDB Atlas (free M0 tier) or local MongoDB, via Mongoose 8 |
| Auth | JWT in an httpOnly cookie, bcrypt password hashing, role-based authorization |
| Testing | Jest + Supertest (backend), Vitest + React Testing Library (frontend), Selenium (coming in Stage 6) |
| Quality | ESLint (with a cyclomatic-complexity rule), code coverage |

---

## 1. What is in this delivery (Stage 2 build)

| Area | Status |
|---|---|
| Backend API: auth, products, categories, orders, deliveries, notifications, users, dashboards, reports | ✅ Built |
| Frontend: all 24 pages, connected to the real API | ✅ Built |
| Seed script with demo accounts and products | ✅ Built |
| Backend tests for the 3 core modules (unit + API integration) | ✅ Built |
| Frontend component tests | ✅ Built |
| API documentation and architecture overview | ✅ `documentation/` |
| Selenium UI test, cyclomatic complexity report, test-case CSV and defect log, Jira mapping and sprint templates | ⏳ Next stages (6–8) |

See **section 9** for exactly what has been verified and how.

---

## 2. Folder structure

```
order-delivery-tracking-system/
├── backend/
│   ├── src/
│   │   ├── config/        env.js (settings), db.js (MongoDB connection)
│   │   ├── models/        User, Category, Product, Order, Delivery, Notification, Counter
│   │   ├── validators/    input rules (zod) for every request
│   │   ├── middleware/    auth.js (login + roles), validate.js, rateLimiters.js, errorHandler.js
│   │   ├── services/      business logic: orders, deliveries, auth, catalog, dashboards, reports…
│   │   ├── controllers/   thin request → service → response functions
│   │   ├── routes/        index.js — every API URL in one file
│   │   ├── utils/         orderStatus.js (status rules), orderId.js, csv.js, http.js, dates.js
│   │   ├── scripts/       seed.js (demo data)
│   │   ├── app.js         builds the Express app (used by tests)
│   │   └── server.js      connects to MongoDB and starts the server
│   ├── tests/             unit/ + integration/ + setup/
│   ├── .env.example       copy to .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/         public/, customer/, admin/, delivery/, shared/
│   │   ├── components/    ui/, orders/, products/, tracking/, forms/
│   │   ├── layouts/       PublicLayout, DashboardLayout
│   │   ├── context/       AuthContext, CartContext, ToastContext
│   │   ├── services/      api.js (fetch wrapper), endpoints.js (all API calls)
│   │   ├── hooks/         useAsync.js
│   │   ├── routes/        AppRoutes.jsx, ProtectedRoute.jsx
│   │   ├── utils/         format.js, status.js, validation.js
│   │   ├── styles/        global.css (design tokens + components)
│   │   └── test/          component tests
│   ├── vite.config.js     includes the /api proxy to the backend
│   └── package.json
├── documentation/         architecture.md, api-documentation.md
├── testing/               (Stages 5–7: test cases, defect log, Selenium, complexity)
├── .gitignore
└── README.md
```

How the pieces connect:
1. A React page calls `services/endpoints.js`.
2. `endpoints.js` uses `api.js`, which sends `/api/...` to the Vite dev server.
3. The Vite dev server forwards the request to Express on port 5000.
4. Express runs `routes/index.js` → middleware → controller → service → MongoDB.

---

## 3. Prerequisites (Windows 11)

| Tool | How to get it | Check (in a terminal) |
|---|---|---|
| Node.js **22 LTS** (20 also works) | https://nodejs.org → "LTS" Windows installer. Keep "Add to PATH" ticked. | `node -v` and `npm -v` |
| Git | https://git-scm.com/download/win (default options) | `git --version` |
| VS Code | https://code.visualstudio.com | — |
| MongoDB Atlas account | https://www.mongodb.com/cloud/atlas/register (free) | — |
| Google Chrome | Needed later for Selenium | — |

> **PowerShell error "running scripts is disabled on this system" when you type `npm`?**
> Run this once in PowerShell, then reopen the terminal:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## 4. Set up MongoDB Atlas (one time, about 10 minutes)

Atlas is MongoDB running in the cloud. Your laptop connects to it over the internet using a **connection string**. Think of the string as an address plus a key.

1. **Create a free cluster.** Log in to Atlas → **Create** → choose the **M0 (Free)** tier → pick a nearby region (e.g. Mumbai) → **Create deployment**.
2. **Create a database user.** Atlas asks for one straight away; you can also find it under **Security → Database Access → Add New Database User**.
   - Use a username like `odts_user`.
   - Use a password **without special characters** to avoid encoding problems (e.g. `OdtsDemo2026`).
   - Write both down.
3. **Allow your IP address.** Go to **Security → Network Access → Add IP Address → Add Current IP Address**.
   - College Wi-Fi changes IP addresses. For a demo day you may choose **Allow access from anywhere (0.0.0.0/0)**.
   - Only do that with a strong database password, and remove it after the review.
4. **Copy the connection string.** Go to **Database → Connect → Drivers** (Node.js). It looks like:
   `mongodb+srv://odts_user:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
5. **Add the database name.** Replace `<password>` with your password, and put **`odts`** after the `/`:
   `mongodb+srv://odts_user:OdtsDemo2026@cluster0.abcde.mongodb.net/odts?retryWrites=true&w=majority&appName=Cluster0`

You will paste this string into `backend/.env` in step 5.3.

---

## 5. Run the project (step by step)

### 5.1 Open the project in VS Code
1. Unzip the project, e.g. to `C:\Projects\order-delivery-tracking-system`.
2. VS Code → **File → Open Folder…** → choose that folder.
3. Open a terminal: **Terminal → New Terminal**.
4. Click the **split** icon (⊞) in the terminal panel so you have **two terminals** side by side:
   - **Terminal 1 = BACKEND**
   - **Terminal 2 = FRONTEND**

### 5.2 Install backend dependencies — Terminal 1
```powershell
cd backend
npm install
```

### 5.3 Create the backend environment file — Terminal 1
```powershell
Copy-Item .env.example .env
code .env
```
In the `.env` file that opens:

1. Set `MONGODB_URI` to your Atlas string from section 4.
2. Generate a random `JWT_SECRET` by running this command and pasting its output into `.env`:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. Leave the other values as they are, then save the file (Ctrl+S).

> `.env` contains secrets. It is listed in `.gitignore`, so Git will not upload it. **Never** commit it.

### 5.4 Load the demo data — Terminal 1
```powershell
npm run seed
```
Expected output ends with `Seed complete.` This creates the demo users, 5 categories and 16 products.

- Running it again is safe: it updates the demo data and does not reset stock.
- For a completely clean demo, run `npm run seed:reset`. **This deletes all ODTS data, including orders.**

### 5.5 Start the backend — Terminal 1
```powershell
npm run dev
```
Wait for these two lines:
```
MongoDB connected: ...
ODTS API listening on http://localhost:5000/api (development)
```
Leave this terminal running. Check it from a browser: http://localhost:5000/api/health

### 5.6 Install and start the frontend — Terminal 2
```powershell
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

> Always use **localhost**, not 127.0.0.1. The login cookie and the CORS setting are tied to `localhost`.

### 5.7 Demo accounts (development only)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@odts.test` | `Admin@123` |
| Customer | `customer@odts.test` | `Customer@123` |
| Delivery person 1 | `ravi.delivery@odts.test` | `Delivery@123` |
| Delivery person 2 | `priya.delivery@odts.test` | `Delivery@123` |

These come from the `SEED_*` lines in `backend/.env`. To change them, edit those lines and run `npm run seed` again. They are **demo credentials for local development only**.

There is no public way to create an admin. New delivery staff are added by the admin under **Delivery personnel**.

### 5.8 Demo the full workflow (about 5 minutes)

Use a normal window for the customer and an **Incognito window** for staff. Each window keeps its own login.

1. **Register (customer).** Go to **Sign up**, create a customer account, and you land on the customer dashboard. You can also log in as `customer@odts.test`.
2. **Browse.** Go to **Products**, search for "bottle", filter by category, then open a product.
3. **Cart and checkout.** Click **Add to cart** → **Cart** → change the quantity → check the address → **Place order**. The confirmation page shows an Order ID like **`ODTS-20261009-0001`**.
4. **Admin confirms.** Log in as admin (Incognito) → **Orders** → open the order → **Confirm order**.
5. **Assign a rider.** On the same page, in **Delivery assignment**, choose *Ravi Shankar* and a date → **Assign delivery**. You can also use **Assign deliveries** in the sidebar.
6. **Admin ships.** Click **Start processing**, then **Mark as shipped**. Shipping is blocked until someone is assigned.
7. **Delivery person updates.** Log out, then log in as `ravi.delivery@odts.test` → **My deliveries** → **Open** → **Out for delivery**, add a note → **Mark as delivered**.
   - Logging in as Priya shows she **cannot** see Ravi's delivery.
8. **Customer tracks.** In the customer window, go to **My orders** → **Track**. The timeline shows each step with its timestamp, and **Notifications** lists every update. The tracking page also refreshes by itself every 20 seconds.
9. **Admin dashboard and reports.** **Dashboard** shows live counts. **Reports** offers date and status filters, total order value, and **Export CSV**.

---

## 6. Running the tests

### Backend tests (Jest + Supertest) — Terminal 1 (stop the server first with Ctrl+C, or open a third terminal)
```powershell
cd backend
npm test
```
- Tests use their **own temporary database**. They never touch your Atlas data. See `backend/tests/setup/db.js`.
- By default they start an in-memory MongoDB (`mongodb-memory-server`).
  - The **first run downloads a MongoDB binary (around 70 MB)** from mongodb.org, so it needs internet and takes a minute or two.
  - Later runs are fast.
- **Alternative:** if that download is blocked on your network, create a separate Atlas database for tests. Add this line to `backend/.env`; the database name **must contain "test"**, otherwise the tests refuse to run:
  ```
  MONGODB_URI_TEST=mongodb+srv://odts_user:YOURPASSWORD@cluster0.abcde.mongodb.net/odts_test?retryWrites=true&w=majority
  ```

| File | Module |
|---|---|
| `tests/integration/auth.test.js` | Module 1: authentication and authorization (20 tests) |
| `tests/integration/productsOrders.test.js` | Module 2: products and orders (25 tests) |
| `tests/integration/deliveryTracking.test.js` | Module 3: delivery assignment, status updates, tracking, notifications, dashboard, reports (24 tests) |
| `tests/unit/*.test.js` | Status rules, validators, helpers, API basics that need no database (42 tests) |

### Coverage
```powershell
npm run test:coverage
```
The summary table prints in the terminal. For a detailed, colour-coded view, open `backend/coverage/index.html` in your browser.

| Column | Meaning |
|---|---|
| Statements / Lines | How many lines of code ran during the tests |
| Branches | How many `if`/`else` paths were taken |
| Functions | How many functions were called |

Red lines in the HTML view were never executed; those are good places to add tests.

### Frontend tests (Vitest + React Testing Library) — Terminal 2
```powershell
cd frontend
npm test
```

### Lint and complexity
```powershell
cd backend
npm run lint                # must show no errors
npm run lint:complexity     # lists the complexity of EVERY function (threshold 1) — useful for the report
```
The normal lint run warns when a function's cyclomatic complexity is above 10. The full complexity analysis document comes in Stage 7.

---

## 7. Troubleshooting

| Problem | What it looks like | Fix |
|---|---|---|
| **MongoDB connection fails** | Backend prints `Could not connect to MongoDB` and a checklist | 1) Atlas → Network Access: add your current IP. 2) Check the username and password in `MONGODB_URI`. 3) URL-encode special characters in the password (`@` → `%40`). 4) Make sure `/odts` is before the `?`. |
| `querySrv ENOTFOUND` / `ECONNREFUSED` | DNS or network problem | College networks often block MongoDB's port 27017; try a **mobile hotspot**. Or set Windows DNS to `8.8.8.8`. |
| **Port already in use** | `Port 5000 is already in use` | Another backend is still running. Find it with `netstat -ano \| findstr :5000`, then stop it with `taskkill /PID <number> /F`. Or set `PORT=5001` in `backend/.env` **and** `VITE_API_PROXY_TARGET=http://localhost:5001` in `frontend/.env`. |
| Port 5173 in use | Vite refuses to start | Close the other `npm run dev` window, or stop it with the same `netstat`/`taskkill` steps. |
| **Missing environment variables** | `Missing environment variable(s): MONGODB_URI, JWT_SECRET` | You have not created `backend/.env` (step 5.3), or it is saved as `.env.txt`. In VS Code the file must be named exactly `.env`. |
| **Dependency installation errors** | `npm ERR!` during install | Check that `node -v` shows 20 or higher. Delete the `node_modules` folder and run `npm install` again. Behind a proxy, ask the lab admin. Run `npm cache verify` if the cache is corrupt. |
| **CORS error** in the browser console | "blocked by CORS policy" | Open the app at **http://localhost:5173**, not 127.0.0.1 or another port. `CLIENT_ORIGIN` in `backend/.env` must match that address exactly. |
| **Invalid login** | "Invalid email or password" | Run `npm run seed` again; it resets the demo passwords to the values in `.env`. Passwords are case-sensitive. |
| Too many attempts | "Too many attempts. Please wait 15 minutes" | The login rate limit was hit. Restart the backend to reset it during development. |
| **Frontend cannot reach the backend** | Red message: "Cannot reach the server…" | Terminal 1 must show `ODTS API listening…`. Test http://localhost:5000/api/health directly. |
| Logged out unexpectedly | Sent back to the login page | Your session lasts 1 day (`JWT_EXPIRES_IN`). After that you log in again. |
| Tests stuck at "Downloading MongoDB" | First test run takes long | Wait (one-time download). If it fails, use the `MONGODB_URI_TEST` option in section 6. |

---

## 8. Security notes (summary)

Full details and trade-offs are in `documentation/architecture.md` §6.

- **Passwords:** hashed with bcrypt and never returned by the API.
- **Login token:** stored in an httpOnly, SameSite=Lax cookie. JavaScript cannot read it.
- **Roles:** checked on the server for every request and loaded from the database. Hiding a button in the UI is never the only protection.
- **Input:** every request is validated with zod, and unknown fields are dropped. A customer cannot send `role: "admin"` or `price: 1`.
- **Prices:** the server always recalculates prices and totals. Stock is reserved atomically, and duplicate checkouts are blocked.
- **Data isolation:** customers only see their own orders; another customer's order returns 404. Delivery staff only see their assigned deliveries.
- **Abuse limits:** auth endpoints are rate-limited, helmet security headers are set, CORS is limited to the frontend address, and stack traces are hidden outside development.
- **Password reset** is a **demo flow**. No email is sent; in development the link is shown on screen and in the backend terminal.

---

## 9. Verification status (honest record)

These checks were run in the build environment (Linux, Node 22) on **9 Oct 2026**.

| Check | Result | Notes |
|---|---|---|
| Backend ESLint | ✅ 0 errors, 0 warnings | — |
| Backend unit tests (no database) | ✅ 42 / 42 passed | — |
| Backend integration tests (3 core modules) | ✅ 69 / 69 passed — **see note** | Run against **FerretDB 1.24**, a MongoDB-compatible server, because the MongoDB binary download was blocked in the build environment. **Still to verify on your laptop:** run `npm test` against real MongoDB (section 6) and record the result. |
| Seed script | ✅ Ran successfully (same FerretDB server) | — |
| End-to-end API run through the Vite proxy | ✅ Passed | Customer login → order → admin confirm → assign → processing → shipped → rider out-for-delivery → delivered → customer tracking (6 steps done) → 6 notifications → dashboard → reports → CSV. An unassigned rider was correctly blocked (403). |
| Frontend ESLint | ✅ 0 errors, 0 warnings | — |
| Frontend component tests | ✅ 9 / 9 passed | — |
| Frontend production build (`vite build`) | ✅ Succeeded | — |
| Visual check of the pages in a real browser | ❌ **Not done** | No browser was available in the build environment. Please click through section 5.8 and report anything that looks wrong. |
| Run on Windows 11 with MongoDB Atlas | ❌ **Not done** | This is your first run. |

Your own test results for the review should come from **your** laptop runs, not from this table.

---

## 10. Next stages

| Stage | Contents |
|---|---|
| 6 | Selenium WebDriver workflow: login → catalogue → order → tracking → compare status with the API → screenshot. Stable `data-testid` selectors are already in the pages. |
| 7 | Cyclomatic complexity analysis of `assertTransitionAllowed` (`backend/src/utils/orderStatus.js`), with how to reproduce it, plus the coverage write-up |
| 5/7 docs | `testing/test-cases.csv`, `testing/test-plan.md` and `testing/defect-log.csv`, filled from **your** real runs |
| 8 | Jira issue mapping (ODTS-1 … ODTS-18), task split for Members 1–3, sprint plan, review and retrospective templates, commit-message guide |
| 10 | Final consistency review and the Project Review 2 checklist |
