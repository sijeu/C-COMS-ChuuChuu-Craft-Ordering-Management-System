# Chuu Chuu Craft

Plain HTML/CSS/JS frontend (`frontend/`) + Express/MongoDB backend (`backend/`).

## Run
1. Install Node 18+ and MongoDB (local) or an Atlas cluster.
2. `cd backend && cp .env.example .env` and fill it in (Mongo URI, JWT secret, admin login, SMTP).
3. `npm install`
4. `npm run dev` → open http://localhost:3000 (the backend also serves the frontend).

Leave `SMTP_HOST` empty while developing and the OTP codes / receipts are printed in the server console instead of emailed.
For Gmail use an App Password (Google Account → Security → 2-Step Verification → App passwords).

## What it does
- Browsing is open to everyone; **adding to the cart / ordering requires an account**.
- Sign-up emails a **6-digit OTP** (10 min expiry, 5 tries, 30 s resend); the account is only created after the code is verified.
- Checkout records a required phone number and delivery address with each order. Placing an order emails an **itemised receipt** to the customer; they can re-send it from My Account.
- Customers choose GCash or PayMaya at checkout and see the configured QR code and account details. Orders remain unpaid until an admin confirms payment; only then is a receipt emailed, and customers can resend it from My Account.
- Admin: create, edit, update status, archive, and restore orders; configure payment QR codes/account details; manage custom requests; and view **sales reports** (7d / 30d / 90d / 12 months, best sellers, sales by category, CSV export). Order statuses include Delivered and Completed. No inventory/stock management.

API: `/api/auth` (register, verify, resend, login, me), `/api/products`, `/api/orders` (incl. `/report` and admin order management), `/api/payment-methods`, `/api/requests`.
