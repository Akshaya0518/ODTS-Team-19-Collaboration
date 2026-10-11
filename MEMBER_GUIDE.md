# Member 1 — Abinethra G S (AS)

## Jira ownership
- ODTS-3 Customer Login
- ODTS-4 Password Reset
- ODTS-9 Manage Product Categories
- ODTS-13 Assign Delivery Personnel
- ODTS-16 Receive Delivery Notifications

## Main files to own/review
- `frontend/src/pages/public/Login.jsx`
- `frontend/src/pages/public/ForgotPassword.jsx`
- `frontend/src/pages/public/ResetPassword.jsx`
- `frontend/src/pages/admin/AdminCategories.jsx`
- `frontend/src/pages/admin/AdminAssignments.jsx`
- `frontend/src/pages/shared/Notifications.jsx`
- Related auth, catalog/category, delivery-assignment, and notification API files under `backend/src/` and `frontend/src/services/`.

This ZIP contains the **complete shared application** so it can be opened and run in VS Code. Work only on your assigned features; coordinate before editing shared routes, API services, or common components.

## Run locally
1. Install Node.js 20 or newer and MongoDB access.
2. In `backend/`, run `npm install`. Copy `.env.example` to `.env`, then set `MONGODB_URI` and a strong `JWT_SECRET`.
3. Run `npm run seed` if you want the demo data, then `npm run dev`.
4. In a second terminal, enter `frontend/`, run `npm install`, then `npm run dev`. Open the URL Vite prints (usually `http://localhost:5173`).

## GitHub collaboration
For team collaboration, clone the team's one shared GitHub repository and create branch `feature/as-auth-notifications`. Do not create a separate long-term repository from this ZIP. Commit and push your branch, then open a pull request to `main`. Never commit `.env` or credentials.
