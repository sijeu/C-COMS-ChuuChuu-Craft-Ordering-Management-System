const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, PendingUser } = require("../models");
const { sendOtp } = require("../mailer");
const { requireAuth } = require("../middleware/auth");

const OTP_MINUTES = 10, MAX_ATTEMPTS = 5, RESEND_SECONDS = 30;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const normEmail = e => String(e || "").trim().toLowerCase();

const publicUser = u => ({ id: String(u._id), name: u.name, email: u.email, role: u.role });
const session = u => ({ token: jwt.sign({ id: String(u._id), role: u.role }, process.env.JWT_SECRET, { expiresIn: "7d" }), user: publicUser(u) });
const newCode = () => String(crypto.randomInt(100000, 1000000));

async function issueCode(pending, code) {
  pending.otpHash = await bcrypt.hash(code, 8);
  pending.attempts = 0;
  pending.lastSentAt = new Date();
  pending.expiresAt = new Date(Date.now() + OTP_MINUTES * 60 * 1000);
  await pending.save();
}

// Step 1: validate, store the sign-up as pending, email a 6-digit code
router.post("/register", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 80);
  const email = normEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!name || !email || !password) return res.status(400).json({ error: "Please fill in every field." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "That email doesn't look right." });
  if (password.length < 6) return res.status(400).json({ error: "Use at least 6 characters for your password." });
  if (await User.exists({ email })) return res.status(409).json({ error: "An account with that email already exists." });

  const code = newCode();
  const pending = (await PendingUser.findOne({ email })) || new PendingUser({ email });
  pending.name = name;
  pending.passwordHash = await bcrypt.hash(password, 10);
  await issueCode(pending, code);
  try { await sendOtp(email, name, code); }
  catch (e) { console.error("OTP email failed:", e.message); return res.status(502).json({ error: "We couldn't send the code. Check the email address and try again." }); }
  res.status(202).json({ pending: true, email });
});

// Step 2: check the code, then create the real account
router.post("/verify", async (req, res) => {
  const email = normEmail(req.body?.email);
  const otp = String(req.body?.otp || "").trim();
  const pending = await PendingUser.findOne({ email });
  if (!pending || pending.expiresAt < new Date()) return res.status(400).json({ error: "That code has expired. Tap “Resend code” to get a new one." });
  if (pending.attempts >= MAX_ATTEMPTS) return res.status(429).json({ error: "Too many wrong tries. Tap “Resend code” to get a new one." });
  if (!/^\d{6}$/.test(otp) || !(await bcrypt.compare(otp, pending.otpHash))) {
    pending.attempts += 1; await pending.save();
    return res.status(400).json({ error: "That code isn't right. Check your email and try again." });
  }
  if (await User.exists({ email })) { await pending.deleteOne(); return res.status(409).json({ error: "An account with that email already exists." }); }
  const user = await User.create({ name: pending.name, email, passwordHash: pending.passwordHash, role: "customer" });
  await pending.deleteOne();
  res.status(201).json(session(user));
});

router.post("/resend", async (req, res) => {
  const email = normEmail(req.body?.email);
  const pending = await PendingUser.findOne({ email });
  if (!pending) return res.status(400).json({ error: "Please sign up again." });
  const wait = RESEND_SECONDS - (Date.now() - pending.lastSentAt.getTime()) / 1000;
  if (wait > 0) return res.status(429).json({ error: `Please wait ${Math.ceil(wait)} seconds before asking for another code.` });
  const code = newCode();
  await issueCode(pending, code);
  try { await sendOtp(email, pending.name, code); }
  catch (e) { console.error("OTP email failed:", e.message); return res.status(502).json({ error: "We couldn't send the code. Try again in a moment." }); }
  res.json({ ok: true });
});

router.post("/login", async (req, res) => {
  const email = normEmail(req.body?.email);
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(String(req.body?.password || ""), user.passwordHash)))
    return res.status(401).json({ error: "Wrong email or password." });
  res.json(session(user));
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: "Please log in." });
  res.json(publicUser(user));
});

module.exports = router;
