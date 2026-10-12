const router = require("express").Router();
const { Order, Product, User, PaymentSettings, STATUSES, PAYMENT_METHODS } = require("../models");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendReceipt } = require("../mailer");

const shape = o => ({
  id: o.orderId, customer: o.customerName, email: o.customerEmail, phone: o.customerPhone,
  deliveryAddress: o.deliveryAddress, paymentMethod: o.paymentMethod || "",
  paymentName: o.paymentName || "", paymentNumber: o.paymentNumber || "",
  note: o.note, status: o.status, total: o.total,
  isPaid: !!o.isPaid, paidAt: o.paidAt || null,
  isArchived: !!o.isArchived, archivedAt: o.archivedAt || null,
  placedAt: o.createdAt, receiptSent: !!o.receiptSentAt,
  items: o.items.map(i => ({ id: i.pid, name: i.name, price: i.price, qty: i.qty }))
});

function validCustomerDetails(body) {
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const deliveryAddress = typeof body?.deliveryAddress === "string" ? body.deliveryAddress.trim() : "";
  if (!/^[+()0-9 .-]{7,25}$/.test(phone) || (phone.match(/\d/g) || []).length < 7)
    return { error: "Enter a valid phone number with at least 7 digits." };
  if (deliveryAddress.length < 5 || deliveryAddress.length > 300)
    return { error: "Enter a delivery address between 5 and 300 characters." };
  return { phone, deliveryAddress };
}

async function buildItems(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 50)
    return { error: "Your order must have between 1 and 50 items." };
  const wanted = new Map();
  for (const i of raw) {
    const qty = Number(i?.qty);
    if (typeof i?.id !== "string" || !Number.isInteger(qty) || qty < 1 || qty > 99)
      return { error: "Invalid item in order." };
    wanted.set(i.id, (wanted.get(i.id) || 0) + qty);
  }
  const products = await Product.find({ pid: { $in: [...wanted.keys()] } });
  if (products.length !== wanted.size) return { error: "An item in your order no longer exists." };
  if (products.some(p => p.price == null)) return { error: "An item in your order has no price yet." };
  const items = products.map(p => ({ pid: p.pid, name: p.name, price: p.price, qty: wanted.get(p.pid) }));
  return { items, total: items.reduce((sum, item) => sum + item.price * item.qty, 0) };
}

async function paymentDetails(method) {
  if (!PAYMENT_METHODS.includes(method)) return null;
  const settings = await PaymentSettings.findOne({ key: "default" });
  const account = settings?.methods?.[method];
  if (!account?.name || !account.number || !account.qrData) return null;
  return { paymentMethod: method, paymentName: account.name, paymentNumber: account.number };
}

async function newOrderId() {
  for (let n = 0; n < 10; n++) {
    const id = "CC-" + Math.floor(1000 + Math.random() * 9000);
    if (!(await Order.exists({ orderId: id }))) return id;
  }
  return "CC-" + Date.now().toString().slice(-6);
}

async function emailReceipt(order) {
  try {
    await sendReceipt({ name: order.customerName, email: order.customerEmail }, order);
    order.receiptSentAt = new Date();
    await order.save();
    return true;
  } catch (e) {
    console.error("Receipt email failed:", e.message);
    return false;
  }
}

// Place an order — login required
router.post("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: "Please log in." });
  if (user.role !== "customer") return res.status(403).json({ error: "Log in with a customer account to place orders." });

  const contact = validCustomerDetails(req.body);
  if (contact.error) return res.status(400).json({ error: contact.error });
  const payment = await paymentDetails(req.body?.paymentMethod);
  if (!payment) return res.status(400).json({ error: "Choose a configured GCash or PayMaya payment method." });
  const cart = await buildItems(req.body?.items);
  if (cart.error) return res.status(400).json({ error: cart.error });
  const order = await Order.create({
    orderId: await newOrderId(),
    user: user._id,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: contact.phone,
    deliveryAddress: contact.deliveryAddress,
    ...payment,
    items: cart.items,
    note: String(req.body?.note || "").slice(0, 300),
    total: cart.total
  });

  res.status(201).json({ ...shape(order), emailed: false, email: user.email });
});

router.get("/mine", requireAuth, async (req, res) => {
  res.json((await Order.find({ user: req.user.id, $or: [{ isArchived: false }, { isArchived: { $exists: false } }] }).sort({ createdAt: -1 })).map(shape));
});

// Re-send the receipt for one of your own orders
router.post("/:orderId/receipt", requireAuth, async (req, res) => {
  const o = await Order.findOne({
    orderId: req.params.orderId.toUpperCase(), user: req.user.id,
    $or: [{ isArchived: false }, { isArchived: { $exists: false } }]
  });
  if (!o) return res.status(404).json({ error: "Order not found." });
  if (!o.isPaid) return res.status(403).json({ error: "The receipt will be available after your payment is confirmed." });
  if (!(await emailReceipt(o))) return res.status(502).json({ error: "We couldn't send the receipt. Try again in a moment." });
  res.json({ ok: true, email: o.customerEmail });
});

router.post("/admin/:orderId/receipt", requireRole("admin"), async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() });
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (!order.isPaid) return res.status(409).json({ error: "Mark the order as paid before sending its receipt." });
  if (!(await emailReceipt(order))) return res.status(502).json({ error: "Payment is confirmed, but the receipt could not be sent. Try again." });
  res.json({ ok: true, email: order.customerEmail });
});

router.get("/track/:orderId", async (req, res) => {
  const o = await Order.findOne({ orderId: req.params.orderId.toUpperCase(), $or: [{ isArchived: false }, { isArchived: { $exists: false } }] });
  if (!o) return res.status(404).json({ error: "Order not found." });
  res.json({ id: o.orderId, status: o.status, count: o.items.length });
});

/* ---------- Admin ---------- */

// Sales report: totals, revenue over time, best sellers, sales by category
router.get("/report", requireRole("admin"), async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const group = days > 120 ? "month" : "day";
  const OFFSET = 8 * 3600 * 1000; // report in Philippine time (UTC+8)
  const local = d => new Date(new Date(d).getTime() + OFFSET);
  const dayKey = d => local(d).toISOString().slice(0, 10);
  const bucketKey = d => (group === "month" ? local(d).toISOString().slice(0, 7) : dayKey(d));

  const start = new Date(dayKey(new Date()) + "T00:00:00+08:00");
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const orders = await Order.find({ createdAt: { $gte: start } });

  // empty buckets so the chart has no gaps
  const series = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const k = bucketKey(d);
    if (!series.has(k)) series.set(k, { key: k, orders: 0, revenue: 0 });
  }

  const pids = [...new Set(orders.flatMap(o => o.items.map(i => i.pid)))];
  const cats = Object.fromEntries((await Product.find({ pid: { $in: pids } })).map(p => [p.pid, p.cat]));
  const top = new Map(), byCat = new Map();
  let revenue = 0, pieces = 0;

  for (const o of orders) {
    revenue += o.total;
    const b = series.get(bucketKey(o.createdAt));
    if (b) { b.orders += 1; b.revenue += o.total; }
    for (const i of o.items) {
      pieces += i.qty;
      const t = top.get(i.pid) || { id: i.pid, name: i.name, qty: 0, revenue: 0 };
      t.qty += i.qty; t.revenue += i.price * i.qty; top.set(i.pid, t);
      const c = cats[i.pid] || "other";
      const cc = byCat.get(c) || { cat: c, pieces: 0, revenue: 0 };
      cc.pieces += i.qty; cc.revenue += i.price * i.qty; byCat.set(c, cc);
    }
  }

  res.json({
    days, group,
    totals: { revenue, orders: orders.length, pieces, avg: orders.length ? revenue / orders.length : 0 },
    series: [...series.values()],
    topItems: [...top.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    byCategory: [...byCat.values()].sort((a, b) => b.revenue - a.revenue)
  });
});

router.get("/", requireRole("admin"), async (req, res) => {
  const archived = req.query.archived === "true";
  const query = archived ? { isArchived: true } : { $or: [{ isArchived: false }, { isArchived: { $exists: false } }] };
  res.json((await Order.find(query).sort({ createdAt: -1 }).limit(500)).map(shape));
});

router.post("/admin", requireRole("admin"), async (req, res) => {
  const name = typeof req.body?.customer === "string" ? req.body.customer.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return res.status(400).json({ error: "Enter a customer name and valid email address." });
  const contact = validCustomerDetails(req.body);
  if (contact.error) return res.status(400).json({ error: contact.error });
  const payment = await paymentDetails(req.body?.paymentMethod);
  if (!payment) return res.status(400).json({ error: "Choose a configured GCash or PayMaya payment method." });
  if (!STATUSES.includes(req.body?.status)) return res.status(400).json({ error: "Invalid status." });
  const cart = await buildItems(req.body?.items);
  if (cart.error) return res.status(400).json({ error: cart.error });
  const customerAccount = await User.findOne({ email, role: "customer" });
  const order = await Order.create({
    orderId: await newOrderId(), user: customerAccount?._id || null, customerName: name, customerEmail: email,
    customerPhone: contact.phone, deliveryAddress: contact.deliveryAddress,
    ...payment, items: cart.items,
    note: typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 300) : "",
    status: req.body.status, total: cart.total
  });
  res.status(201).json(shape(order));
});

router.patch("/:orderId", requireRole("admin"), async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() });
  if (!order) return res.status(404).json({ error: "Order not found." });
  const name = typeof req.body?.customer === "string" ? req.body.customer.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!name || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return res.status(400).json({ error: "Enter a customer name and valid email address." });
  const contact = validCustomerDetails(req.body);
  if (contact.error) return res.status(400).json({ error: contact.error });
  if (!STATUSES.includes(req.body?.status)) return res.status(400).json({ error: "Invalid status." });
  if (req.body?.paymentMethod && !PAYMENT_METHODS.includes(req.body.paymentMethod))
    return res.status(400).json({ error: "Invalid payment method." });
  const payment = req.body?.paymentMethod
    ? req.body.paymentMethod === order.paymentMethod
      ? { paymentMethod: order.paymentMethod, paymentName: order.paymentName || "", paymentNumber: order.paymentNumber || "" }
      : await paymentDetails(req.body.paymentMethod)
    : null;
  if (req.body?.paymentMethod && !payment)
    return res.status(400).json({ error: "That payment method is not configured." });
  const cart = await buildItems(req.body?.items);
  if (cart.error) return res.status(400).json({ error: cart.error });
  if (order.isPaid && cart.total !== order.total) {
    order.isPaid = false;
    order.paidAt = null;
    order.receiptSentAt = null;
  }
  order.customerName = name;
  order.customerEmail = email;
  order.customerPhone = contact.phone;
  order.deliveryAddress = contact.deliveryAddress;
  order.paymentMethod = payment?.paymentMethod || "";
  order.paymentName = payment?.paymentName || "";
  order.paymentNumber = payment?.paymentNumber || "";
  order.items = cart.items;
  order.note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 300) : "";
  order.status = req.body.status;
  order.total = cart.total;
  await order.save();
  res.json(shape(order));
});

router.patch("/:orderId/archive", requireRole("admin"), async (req, res) => {
  const archived = req.body?.archived;
  if (typeof archived !== "boolean") return res.status(400).json({ error: "Specify whether the order should be archived." });
  const order = await Order.findOneAndUpdate(
    { orderId: req.params.orderId.toUpperCase() },
    { isArchived: archived, archivedAt: archived ? new Date() : null },
    { new: true }
  );
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json(shape(order));
});

router.patch("/:orderId/payment", requireRole("admin"), async (req, res) => {
  if (req.body?.isPaid !== true) return res.status(400).json({ error: "Only payment confirmation is supported." });
  const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() });
  if (!order) return res.status(404).json({ error: "Order not found." });

  if (!order.isPaid) {
    order.isPaid = true;
    order.paidAt = new Date();
    await order.save();
  }

  const emailed = order.receiptSentAt ? true : await emailReceipt(order);
  res.json({ ...shape(order), emailed, receiptSent: !!order.receiptSentAt });
});

router.patch("/:orderId/status", requireRole("admin"), async (req, res) => {
  if (!STATUSES.includes(req.body?.status)) return res.status(400).json({ error: "Invalid status." });
  const o = await Order.findOneAndUpdate({ orderId: req.params.orderId }, { status: req.body.status }, { new: true });
  if (!o) return res.status(404).json({ error: "Order not found." });
  res.json(shape(o));
});

module.exports = router;
