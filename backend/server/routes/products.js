const router = require("express").Router();
const { Product } = require("../models");

const shape = p => ({ id: p.pid, name: p.name, cat: p.cat, sub: p.sub, price: p.price });

// Public, read-only catalog. (No inventory/stock management.)
router.get("/", async (req, res) => {
  res.json((await Product.find().sort({ pid: 1 })).map(shape));
});

module.exports = router;
