# ODTS Architecture

## 1. The big picture

```
 Browser (React + Vite, :5173)                Express API (:5000)                       MongoDB Atlas
 ┌──────────────────────────────┐  /api/...   ┌──────────────────────────────────┐ Mongoose ┌──────────────┐
 │ pages → components           │ ──────────▶ │ routes → middleware → validators │ ───────▶ │ users        │
 │ AuthContext, CartContext     │  (cookie)   │        → controllers → services  │          │ categories   │
 │ services/api.js (fetch)      │ ◀────────── │        → models                  │ ◀─────── │ products     │
 └──────────────────────────────┘    JSON     └──────────────────────────────────┘          │ orders       │
        Vite proxy: /api → :5000                                                             │ deliveries   │
                                                                                             │ notifications│
                                                                                             │ counters     │
                                                                                             └──────────────┘
```

**Main rule:** the frontend only *asks*; the backend *decides*. Every price, role, ownership check and status rule is enforced on the server.

## 2. Backend layers (`backend/src`)

| Folder | Job | Example |
|---|---|---|
| `routes/index.js` | Maps each URL to its middleware and controller. The whole API fits on one screen. | `PATCH /deliveries/:id/status` |
| `middleware/` | Login check, role check, input validation, rate limit, errors | `authenticate`, `authorize('admin')`, `validate(schema)` |
| `validators/` | Zod schemas. Unknown fields are removed, which prevents mass assignment. | `createOrder` has **no** price field |
| `controllers/` | Thin layer: read the validated request, call a service, send JSON | `orderController.create` |
| `services/` | Business rules. This is where tests aim. | `orderService.applyStatusChange` |
| `models/` | MongoDB document shapes and indexes | `Order`, `Delivery` |
| `utils/` | Small helpers: status rules, order IDs, CSV export, money rounding | `orderStatus.assertTransitionAllowed` |

`app.js` builds the app; the tests import it directly. `server.js` connects to the database and starts listening.

## 3. Data model

```
User(customer) 1──* Order *──* Product *──1 Category        (order items are price SNAPSHOTS)
                     │1
                     │
                     1
                 Delivery *──1 User(delivery)               (assignee, ETA, notes, deliveredAt)

User 1──* Notification *──1 Order
Counter: { _id: "order-YYYYMMDD", seq }  → order IDs like ODTS-20261009-0042
```

**One source of truth for status.**
- The current status and the full `statusHistory` live on the **Order**.
- The Delivery record holds only the delivery details.
- The tracking page, admin pages and delivery app therefore always show the same status.
- "Pending" is simply *displayed* as "Order Placed".

**Indexes:**
- `users.email` (unique)
- `orders.orderId` (unique)
- `orders.customer + createdAt`
- `orders.status + createdAt`
- `orders.customer + idempotencyKey` (unique)
- `deliveries.order` (unique)
- `deliveries.assignedTo`
- `notifications.user + isRead + createdAt`
- `products.category + isActive`

## 4. Order life cycle

```
Pending ──admin──▶ Confirmed ──admin──▶ Processing ──admin*──▶ Shipped ──rider/admin──▶ Out for Delivery ──rider/admin──▶ Delivered
   │                   │                     │
   └─customer/admin─▶ Cancelled ◀─customer/admin─┘── admin ──┘          * needs an assigned delivery person
```

All rules live in `backend/src/utils/orderStatus.js`. Only one function, `orderService.applyStatusChange`, ever changes a status. It:
1. Checks the rule, the role and the assignment.
2. Saves the new status and a history entry using a *conditional* update. The update only succeeds if the status is still the one we read, so two people cannot change the same order at once.
3. Puts stock back on cancellation, and records `deliveredAt` on delivery.
4. Notifies the customer in the app.

## 5. Placing an order safely

1. Duplicate products in the cart are merged, and the products are loaded from the database.
2. Prices are taken from the database. The delivery fee is ₹40 below ₹999 and free at ₹999 or above.
3. **Stock is reserved atomically**, one product at a time, with "subtract only if enough is left".
   - If any product fails, everything already reserved is put back. This is a *compensating rollback*.
   - We avoid MongoDB multi-document transactions on purpose, because they need a replica set and this keeps local setups simple.
4. The order is saved with a unique order ID.
   - Every order gets an `idempotencyKey`: the browser sends one per checkout, or the server generates one.
   - A double-click therefore returns the existing order instead of creating a second one.

## 6. Security decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| JWT in an **httpOnly, SameSite=Lax cookie** | JavaScript cannot read it, so cross-site scripting cannot steal it. Lax blocks cross-site POST requests. | Needs the Vite proxy (or matching CORS) in development. No refresh tokens: the session lasts 1 day, then the user logs in again. |
| Role loaded from the DB on every request | A demoted or disabled user loses access immediately | One extra database read per request (fine at this scale) |
| Zod validation that strips unknown fields | Prevents `role: "admin"` style mass assignment and `{"$ne": …}` query injection | Every new field must be added to a schema |
| Same error message for an unknown email and a wrong password | Attackers cannot discover which emails are registered | Slightly less specific feedback for users |
| Another customer's order returns **404** (not 403) | Order IDs cannot be probed | — |
| Rate limit on auth routes (20 requests per 15 minutes per IP) | Slows password guessing | Shared networks, such as a college Wi-Fi, share the limit |
| bcrypt (`bcryptjs`) with 10 rounds | Standard password hashing. The pure-JavaScript version installs on Windows without build tools. | Slightly slower than the native module |
| Demo password reset (link printed only in development) | No paid email service is needed | Not a real email flow. In production nothing secret is returned, but no email is sent either. |
| `helmet`, CORS limited to `CLIENT_ORIGIN`, 100 KB body limit | Sensible default protection | — |

## 7. Frontend structure (`frontend/src`)

| Folder | Job |
|---|---|
| `services/api.js` | The one `fetch` wrapper: sends the cookie, turns errors into readable messages |
| `services/endpoints.js` | Every backend URL, grouped by feature (must match `backend/src/routes/index.js`) |
| `context/` | `AuthContext` (who is logged in), `CartContext` (cart in localStorage), `ToastContext` (pop-up messages) |
| `routes/` | `AppRoutes` lists every page; `ProtectedRoute` checks login and role (for convenience only — the API enforces it) |
| `layouts/` | `PublicLayout` (shop top bar) and `DashboardLayout` (sidebar + top bar, menu by role) |
| `components/` | Reusable UI: badges, modals, timeline, order tables, assignment form |
| `pages/` | One file per screen, grouped by `public`, `customer`, `admin`, `delivery`, `shared` |
| `hooks/useAsync.js` | Gives every page the same loading, error and data handling |

**Page → requirement map.**

| # | Requirement | Route |
|---|---|---|
| 1 | Home | `/` |
| 2 | Login | `/login` |
| 3 | Register | `/register` |
| 4 | Catalogue | `/products` |
| 5 | Product details | `/products/:id` |
| 6 | Cart | `/cart` |
| 7 | Order confirmation | `/order-confirmation/:orderId` |
| 8 | Customer dashboard | `/customer` |
| 9 | My orders | `/customer/orders` |
| 10 | Order details | `/customer/orders/:orderId` |
| 11 | Order tracking | `/customer/orders/:orderId/track` |
| 12 | Notifications | `/notifications` |
| 13 | Profile | `/profile` |
| 14 | Admin dashboard | `/admin` |
| 15 | Products | `/admin/products` |
| 16 | Categories | `/admin/categories` |
| 17 | Orders | `/admin/orders` (+ `/admin/orders/:orderId`) |
| 18 | Delivery personnel | `/admin/personnel` |
| 19 | Delivery assignment | `/admin/assignments` |
| 20 | Delivery status management | `/admin/deliveries` |
| 21 | Reports | `/admin/reports` |
| 22 | Delivery dashboard | `/delivery` |
| 23 | Assigned deliveries | `/delivery/deliveries` |
| 24 | Delivery details and status update | `/delivery/deliveries/:id` |
