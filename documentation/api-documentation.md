# ODTS REST API

Base URL (development): `http://localhost:5000/api`. Through the React dev server, it is `http://localhost:5173/api` (proxied).

## Conventions

**Authentication.** Logging in sets an **httpOnly cookie** called `odts_token`, which holds a JWT. Browsers send it automatically. API tools such as Postman or Thunder Client may instead send `Authorization: Bearer <token>`.

**Roles.** There are three roles: `customer`, `admin` and `delivery`. The role is always read from the database, never from the request.

**Response shape.**
```json
{ "success": true,  "message": "…", "data": { … } }
{ "success": false, "message": "…", "errors": [ { "field": "email", "message": "…" } ] }
```

**Status codes.**

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Invalid input (validation) |
| 401 | Not logged in, or the token is invalid or expired |
| 403 | Logged in but not allowed (wrong role, or the delivery is not assigned to you) |
| 404 | Not found. Also returned when a customer requests another customer's order, so that order IDs cannot be guessed. |
| 409 | Conflict: duplicate value, insufficient stock, or a disallowed status change |
| 500 | Server error. Details are only shown in development. |

**IDs and dates.**
- Order IDs look like `ODTS-YYYYMMDD-NNNN`.
- Other IDs are MongoDB ObjectIds (24 hex characters).
- Report and filter dates use `YYYY-MM-DD` and the server's local time zone.

**Pagination.** List endpoints accept `page` (default 1) and `limit` (default 20, maximum 100). They return:
`{ items, total, page, limit, totalPages }`

---

## Auth (ODTS-1, ODTS-3, ODTS-4)

All endpoints marked "rate-limited" allow 20 requests per 15 minutes per IP.

| Method | Path | Who | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | Public (rate-limited) | `name, email, mobile, password, confirmPassword, address{line1, city, state, pincode}` | Always creates a **customer**; any `role` field is ignored. Logs the user in. Returns **201**, or **409** if the email exists. |
| POST | `/auth/login` | Public (rate-limited) | `email, password` | Wrong email and wrong password return the same **401** message. A disabled account gets **403**. |
| POST | `/auth/logout` | Anyone | – | Clears the cookie. |
| GET | `/auth/me` | Logged in | – | Returns the current user. |
| POST | `/auth/forgot-password` | Public (rate-limited) | `email` | Always returns the same message. **Development only:** the response contains `devResetUrl` and the link is printed in the backend terminal. |
| POST | `/auth/reset-password` | Public (rate-limited) | `token, password, confirmPassword` | The token is single-use and valid for 15 minutes. |

Password rules: 8–72 characters, with at least one upper-case letter, one lower-case letter and one number. Mobile numbers must be 10 digits starting with 6–9. Pincodes must be 6 digits.

## Products (ODTS-5, ODTS-8)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/products` | Public | Query: `q` (searches name and description), `category`, `sort` (`newest`, `price_asc`, `price_desc` or `name`), `page`, `limit`. Admins may add `includeInactive=true`. |
| GET | `/products/:id` | Public | Inactive products return **404** to non-admins. |
| POST | `/products` | Admin | `name, description?, category, price (>0), stock (integer ≥0), imageUrl?, isActive?` |
| PATCH | `/products/:id` | Admin | Any of the fields above. Use it to update stock or to deactivate (`{"isActive": false}`). |

## Categories (ODTS-9)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/categories` | Public | Active categories, each with `productCount`. Admins may add `includeInactive=true`. |
| POST | `/categories` | Admin | `name, description?`. A duplicate name returns **409**. |
| PATCH | `/categories/:id` | Admin | `name?, description?, isActive?`. Categories are deactivated, never deleted, so old products keep a valid category. |

## Orders (order placement, ODTS-12)

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/orders` | Customer | See "Placing an order" below. |
| GET | `/orders/mine` | Customer | The customer's own orders only. Query: `status`, `q` (part of an order ID), `page`, `limit`. |
| GET | `/orders` | Admin | All orders, each with `assignedTo`. Query: `status, q, from, to, page, limit`. |
| GET | `/orders/:orderId` | Owner customer, admin, or assigned delivery person | Includes `statusHistory`, `delivery`, and `allowedNextStatuses` (the moves the caller may make). |
| GET | `/orders/:orderId/tracking` | Owner customer, admin, or assigned delivery person | See "Tracking response" below. |
| PATCH | `/orders/:orderId/status` | Admin | `status, note?`. Follows the transition rules below. |
| POST | `/orders/:orderId/cancel` | Owner customer or admin | `reason?`. Puts the stock back and notifies the customer. |

**Placing an order.** The request body is:

```
items[{ productId, quantity 1–20 }], shippingAddress{ recipientName, mobile, line1, city, state, pincode }, idempotencyKey?
```

The server applies these rules:
- **Prices and totals are calculated by the server.** Any price or total sent by the client is ignored.
- Stock is reserved atomically. If any item fails, nothing is reserved.
- Delivery costs ₹40 below ₹999 and is free at ₹999 or above. Both values are configurable in `.env`.
- Sending the same `idempotencyKey` again returns the existing order with **200** instead of creating a duplicate.

Possible responses:

| Code | When |
|---|---|
| 201 | Order created |
| 400 | Invalid input, or an unknown or inactive product |
| 409 | Not enough stock |

**Tracking response.** Contains:
- `status` and `statusLabel`
- `steps[]`, one per timeline step, each with `label`, `state` (`done`, `current`, `upcoming` or `cancelled`) and `at`
- `history[]`, newest first
- `delivery`, with the assignee, estimated delivery date and delivered time
- `trackingType: "STATUS_BASED"`. There is no GPS tracking.

### Order status rules

| From | To | Allowed roles |
|---|---|---|
| Pending | Confirmed | admin |
| Pending | Cancelled | admin, customer (owner) |
| Confirmed | Processing | admin |
| Confirmed | Cancelled | admin, customer (owner) |
| Processing | Shipped | admin (needs an assigned delivery person) |
| Processing | Cancelled | admin |
| Shipped | Out for Delivery | admin, **assigned** delivery person |
| Out for Delivery | Delivered | admin, **assigned** delivery person |
| Delivered / Cancelled | – | final |

Every successful change does three things:
1. Records `{status, changedBy, role, note, at}` in the status history.
2. Creates a notification for the customer.
3. On cancellation, puts the stock back. On delivery, records `deliveredAt`.

Any other change returns **409**. A wrong role returns **403**.

## Deliveries (ODTS-13, ODTS-14, ODTS-15)

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/deliveries/assign` | Admin | See "Assigning a delivery" below. |
| GET | `/deliveries` | Delivery person (own deliveries only) or admin (all) | Query: `scope` (`active`, `completed` or `all`), `deliveryPersonId` (admin only), `page`, `limit`. |
| GET | `/deliveries/:id` | Assigned delivery person or admin | Other delivery staff get **403**. |
| PATCH | `/deliveries/:id/status` | Assigned delivery person or admin | `status, note?`. Uses the same rules as the order status table above. |
| POST | `/deliveries/:id/notes` | Assigned delivery person or admin | `text` (1–500 characters). |

**Assigning a delivery.** The request body is:

```
orderId, deliveryPersonId, estimatedDeliveryDate? (YYYY-MM-DD)
```

Rules:
- The order must be Confirmed, Processing, Shipped or Out for Delivery.
- The chosen user must be an active delivery person.
- The estimated delivery date cannot be in the past.

Responses:
- **201** for a new assignment.
- **200** for a reassignment. Access moves to the new delivery person, who is also notified.

## Notifications (ODTS-16)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/notifications` | Logged in | Returns your notifications plus `unreadCount`. Query: `unreadOnly=true`, `page`, `limit`. |
| PATCH | `/notifications/:id/read` | Owner | Another user's notification returns **404**. |
| PATCH | `/notifications/read-all` | Logged in | Marks all of your notifications as read. |

## Users

| Method | Path | Who | Notes |
|---|---|---|---|
| PATCH | `/users/me` | Logged in | `name?, mobile?, address?`. Email and role cannot be changed. |
| GET | `/users` | Admin | Query: `role, q, page, limit`. |
| GET | `/users/delivery-personnel` | Admin | Each person with counts of active, completed and cancelled deliveries. |
| POST | `/users/delivery-personnel` | Admin | `name, email, mobile, password`. Creates a delivery-role account. |
| PATCH | `/users/:id/status` | Admin | `isActive`. Admin accounts and your own account cannot be changed here. |

## Dashboard and reports (ODTS-17, ODTS-18)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/dashboard` | Logged in | Returns statistics for the caller's role; see "Dashboard contents" below. All numbers are counted in MongoDB when requested. |
| GET | `/reports/orders` | Admin | Query: `from, to, status, format=json\|csv`. See "Order report" below. |
| GET | `/reports/deliveries` | Admin | Query: `from, to` (date of assignment), `status, deliveryPersonId, format`. Includes per-person totals and an on-time flag. |

**Dashboard contents.**

| Role | Statistics |
|---|---|
| Admin | Totals and pending, in-transit, delivered and cancelled orders; products; customers; orders awaiting assignment; recent orders |
| Customer | Own orders, current deliveries, recent notifications |
| Delivery | Assigned, pending and completed deliveries |

**Order report.**
- `totalOrderValue` excludes cancelled orders.
- `pendingDeliveries` counts orders that are neither Delivered nor Cancelled.
- CSV export protects against formula injection.

## Health

`GET /health` responds with `{ success: true, message: "ODTS API is running" }`.
