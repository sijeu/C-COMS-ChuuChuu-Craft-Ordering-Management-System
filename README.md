# Chuu Chuu Craft

Plain HTML/CSS/JS frontend (`frontend/`) + Express/MongoDB backend (`backend/`).

## Run
1. Install Node 18+ and MongoDB (local) or an Atlas cluster.
2. `cd backend && cp .env.example .env` and fill it in (Mongo URI, JWT secret, admin login, SMTP).
3. `npm install`
4. `npm run dev` → open http://localhost:3000 (the backend also serves the frontend).

Leave `SMTP_HOST` empty while developing and the OTP codes / receipts are printed in the server console instead of emailed.
For Gmail use an App Password (Google Account → Security → 2-Step Verification → App passwords).
For a deployed service, set `NODE_ENV=production`. To send from an existing Gmail account without a custom domain, enable the Gmail API in Google Cloud, configure OAuth consent and an OAuth client, then create a refresh token with the `https://www.googleapis.com/auth/gmail.send` scope. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `MAIL_FROM` in Render; `MAIL_FROM` must be the same Gmail address that authorized the OAuth grant. The Gmail API uses HTTPS, avoiding SMTP connectivity restrictions on hosts such as Render. OAuth apps left in Google's External / Testing mode have refresh tokens that expire after seven days, so follow Google's publishing and verification requirements for ongoing use.

Alternatively, set `RESEND_API_KEY` and a Resend-verified `MAIL_FROM`, or use `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`. Gmail API takes priority when its OAuth variables are configured, followed by Resend, then SMTP. Production sign-up reports a configuration error instead of pretending an OTP was emailed when email delivery is unavailable.

## What it does
- Browsing is open to everyone; **adding to the cart / ordering requires an account**.
- Sign-up emails a **6-digit OTP** (10 min expiry, 5 tries, 30 s resend); the account is only created after the code is verified.
- Checkout records a required phone number and delivery address with each order. Placing an order emails an **itemised receipt** to the customer; they can re-send it from My Account.
- Customers choose GCash or PayMaya at checkout and see the configured QR code and account details. Orders remain unpaid until an admin confirms payment; only then is a receipt emailed, and customers can resend it from My Account.
- Admin: create, edit, update status, archive, and restore orders; configure payment QR codes/account details; manage custom requests; and view **sales reports** (7d / 30d / 90d / 12 months, best sellers, sales by category, CSV export). Order statuses include Delivered and Completed. No inventory/stock management.

API: `/api/auth` (register, verify, resend, login, me), `/api/products`, `/api/orders` (incl. `/report` and admin order management), `/api/payment-methods`, `/api/requests`.
