const nodemailer = require("nodemailer");
const crypto = require("crypto");

const SHOP = "Chuu Chuu Craft";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const peso = n => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const base64Lines = value => (Buffer.from(value, "utf8").toString("base64").match(/.{1,76}/g) || []).join("\r\n");

let transport = null;
let googleToken = null;
let googleTokenExpiresAt = 0;

function getTransport() {
  if (transport || !process.env.SMTP_HOST) return transport;
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  return transport;
}

async function getGoogleAccessToken() {
  if (googleToken && Date.now() < googleTokenExpiresAt - 60_000) return googleToken;
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    const error = new Error("Gmail API email requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.");
    error.code = "GMAIL_API_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    const error = new Error(`Google OAuth token request failed${result.error_description ? `: ${result.error_description}` : ` (HTTP ${response.status})`}`);
    error.code = "GMAIL_TOKEN_REQUEST_FAILED";
    throw error;
  }

  googleToken = result.access_token;
  googleTokenExpiresAt = Date.now() + Number(result.expires_in || 3600) * 1000;
  return googleToken;
}

async function sendViaGmailApi({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM;
  if (!from || /[\r\n]/.test(from)) {
    const error = new Error("MAIL_FROM must be set to the Gmail address authorized for Gmail API sending.");
    error.code = "MAIL_FROM_NOT_CONFIGURED";
    throw error;
  }

  const boundary = `chuu_${crypto.randomBytes(12).toString("hex")}`;
  const encodedSubject = /[^\x00-\x7F]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`
    : subject;
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(html),
    `--${boundary}--`
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getGoogleAccessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") })
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(`Gmail API send failed${result.error?.message ? `: ${result.error.message}` : ` (HTTP ${response.status})`}`);
    error.code = "GMAIL_SEND_FAILED";
    throw error;
  }
  return result;
}

// With no SMTP_HOST set, emails are printed to the server console instead (handy while developing).
async function sendMail({ to, subject, html, text }) {
  if (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_REFRESH_TOKEN) {
    return sendViaGmailApi({ to, subject, html, text });
  }

  if (process.env.RESEND_API_KEY) {
    if (!process.env.MAIL_FROM) {
      const error = new Error("MAIL_FROM must be set to a verified sender address when using Resend.");
      error.code = "MAIL_FROM_NOT_CONFIGURED";
      throw error;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text })
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      const error = new Error(`Resend email API returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      error.code = "RESEND_REQUEST_FAILED";
      throw error;
    }
    return response.json();
  }

  const t = getTransport();
  if (!t) {
    if (process.env.NODE_ENV === "production") {
      const error = new Error("Email delivery is not configured. Set Gmail API OAuth variables and MAIL_FROM, RESEND_API_KEY and MAIL_FROM, or configure SMTP.");
      error.code = "SMTP_NOT_CONFIGURED";
      throw error;
    }
    console.log(`\n--- email not sent (SMTP_HOST not set) ---\nTo: ${to}\nSubject: ${subject}\n${text}\n------------------------------------------\n`);
    return { dev: true };
  }
  return t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
}

const wrap = body => `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8f4d6;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:28px;color:#3A3226">
    <h2 style="margin:0 0 16px;color:#6BA0C4">${SHOP}</h2>${body}
    <p style="margin:24px 0 0;font-size:12px;color:#9AB2C6">Made in small batches. Thank you for supporting handmade.</p>
  </div></div>`;

async function sendOtp(to, name, code) {
  const text = `Hi ${name}, your ${SHOP} verification code is ${code}. It expires in 10 minutes. If you didn't sign up, ignore this email.`;
  const html = wrap(`<p>Hi ${esc(name)},</p><p>Use this code to finish creating your account:</p>
    <p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:18px 0;color:#DC7362">${code}</p>
    <p style="font-size:13px;color:#5A6B80">It expires in 10 minutes. If you didn't sign up, you can ignore this email.</p>`);
  return sendMail({ to, subject: `${code} is your ${SHOP} code`, html, text });
}

async function sendReceipt(user, order) {
  const date = new Date(order.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const rows = order.items.map(i => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #ecdfae">${esc(i.name)}</td>
      <td style="padding:8px 8px;border-bottom:1px solid #ecdfae;text-align:center">${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #ecdfae;text-align:right">${peso(i.price)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #ecdfae;text-align:right">${peso(i.price * i.qty)}</td></tr>`).join("");
  const html = wrap(`<p>Hi ${esc(user.name)}, your payment has been confirmed. Here's your receipt.</p>
    <p style="margin:0"><strong>Order number:</strong> ${esc(order.orderId)}<br><strong>Date:</strong> ${esc(date)}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
      <tr style="color:#5A6B80;text-align:left"><th style="padding-bottom:6px">Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr>
      ${rows}
      <tr><td colspan="3" style="padding-top:12px;text-align:right;font-weight:700">Total</td><td style="padding-top:12px;text-align:right;font-weight:700;font-size:16px">${peso(order.total)}</td></tr>
    </table>
    ${order.customerPhone ? `<p style="font-size:13px;color:#5A6B80;margin-top:16px"><strong>Phone:</strong> ${esc(order.customerPhone)}</p>` : ""}
    ${order.deliveryAddress ? `<p style="font-size:13px;color:#5A6B80;white-space:pre-wrap"><strong>Delivery address:</strong> ${esc(order.deliveryAddress)}</p>` : ""}
    ${order.paymentMethod ? `<p style="font-size:13px;color:#5A6B80"><strong>Payment method:</strong> ${esc(order.paymentMethod)}${order.paymentName ? ` · ${esc(order.paymentName)}` : ""}${order.paymentNumber ? ` · ${esc(order.paymentNumber)}` : ""}</p>` : ""}
    ${order.note ? `<p style="margin-top:16px;font-size:13px;color:#5A6B80"><strong>Your note:</strong> ${esc(order.note)}</p>` : ""}
    <p style="font-size:13px;color:#5A6B80;margin-top:16px">You can track this order anytime with the order number above.</p>`);
  const text = [`${SHOP} — payment confirmed and receipt`, `Order ${order.orderId} · ${date}`, "",
    ...order.items.map(i => `${i.name} x${i.qty}  ${peso(i.price * i.qty)}`), "", `Total: ${peso(order.total)}`,
    order.customerPhone ? `Phone: ${order.customerPhone}` : "",
    order.deliveryAddress ? `Delivery address: ${order.deliveryAddress}` : "",
    order.paymentMethod ? `Payment method: ${order.paymentMethod}${order.paymentName ? ` · ${order.paymentName}` : ""}${order.paymentNumber ? ` · ${order.paymentNumber}` : ""}` : ""].filter(Boolean).join("\n");
  return sendMail({ to: user.email, subject: `Your ${SHOP} receipt — ${order.orderId}`, html, text });
}

module.exports = { sendMail, sendOtp, sendReceipt };
