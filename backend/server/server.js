require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { User, Product } = require("./models");

for (const k of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[k]) { console.error(`Missing ${k} in .env`); process.exit(1); }
}

const app = express();
app.set("trust proxy", 1);
app.use(cors());

app.use("/api/payment-methods", express.json({ limit: "4mb" }));
app.use("/api", express.json({ limit: "20kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 }), require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/payment-methods", require("./routes/payment-methods"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// also serve the frontend, so http://localhost:3000 works with one command
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const CATALOG = require("./catalog");

async function seed() {
  // insert products only if missing, so edited prices are never overwritten
  await Product.bulkWrite(CATALOG.map(p => ({ updateOne: { filter: { pid: p.pid }, update: { $setOnInsert: p }, upsert: true } })));

  if (!(await User.exists({ role: "admin" }))) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      await User.create({ name: ADMIN_NAME || "Shop Admin", email: ADMIN_EMAIL, passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10), role: "admin" });
      console.log("Admin account created:", ADMIN_EMAIL);
    } else console.warn("No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
  }
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    await seed();
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Chuu Chuu Craft running at http://localhost:${port}`));
  })
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
