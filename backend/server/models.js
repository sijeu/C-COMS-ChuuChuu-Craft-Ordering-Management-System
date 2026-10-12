const mongoose = require("mongoose");
const { Schema } = mongoose;

const STATUSES = ["Queued", "In the Workshop", "Packed", "Shipped", "Delivered", "Completed"];
const PAYMENT_METHODS = ["gcash", "paymaya"];

const User = mongoose.model("User", new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["customer", "admin"], default: "customer" }
}, { timestamps: true }));

const Product = mongoose.model("Product", new Schema({
  pid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  cat: { type: String, required: true },
  sub: { type: String, default: null },
  price: { type: Number, default: null, min: 0 } // null = price not specified (cannot be ordered)
}));

const Order = mongoose.model("Order", new Schema({
  orderId: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, default: "", maxlength: 25 },
  deliveryAddress: { type: String, default: "", maxlength: 300 },
  paymentMethod: { type: String, enum: ["", ...PAYMENT_METHODS], default: "" },
  paymentName: { type: String, default: "", maxlength: 80 },
  paymentNumber: { type: String, default: "", maxlength: 40 },
  items: [{ _id: false, pid: String, name: String, price: Number, qty: Number }],
  note: { type: String, default: "", maxlength: 300 },
  status: { type: String, enum: STATUSES, default: "Queued" },
  total: { type: Number, required: true },
  isPaid: { type: Boolean, default: false, index: true },
  paidAt: { type: Date, default: null },
  isArchived: { type: Boolean, default: false, index: true },
  archivedAt: { type: Date, default: null },
  receiptSentAt: { type: Date, default: null }
}, { timestamps: true }));

const PaymentSettings = mongoose.model("PaymentSettings", new Schema({
  key: { type: String, required: true, unique: true, default: "default" },
  methods: {
    gcash: {
      name: { type: String, default: "", maxlength: 80 },
      number: { type: String, default: "", maxlength: 40 },
      qrData: { type: String, default: "" }
    },
    paymaya: {
      name: { type: String, default: "", maxlength: 80 },
      number: { type: String, default: "", maxlength: 40 },
      qrData: { type: String, default: "" }
    }
  }
}, { timestamps: true }));

const Request = mongoose.model("Request", new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: String,
  text: { type: String, required: true, maxlength: 1000 },
  needBy: { type: String, default: "" },
  state: { type: String, enum: ["open", "quoted", "declined"], default: "open" }
}, { timestamps: true }));

// Sign-ups waiting for their email OTP; removed automatically once expiresAt passes
const PendingUser = mongoose.model("PendingUser", new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  passwordHash: { type: String, required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}));

module.exports = { User, Product, Order, Request, PendingUser, PaymentSettings, STATUSES, PAYMENT_METHODS };
