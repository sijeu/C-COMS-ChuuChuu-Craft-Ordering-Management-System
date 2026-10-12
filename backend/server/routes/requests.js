const router = require("express").Router();
const { Request, User } = require("../models");
const { requireAuth, requireRole } = require("../middleware/auth");

const shape = r => ({ id: String(r._id), name: r.name, text: r.text, needBy: r.needBy, state: r.state, createdAt: r.createdAt });

router.post("/", requireAuth, async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Describe the piece you have in mind." });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: "Please log in." });
  const r = await Request.create({ user: user._id, name: user.name, text: text.slice(0, 1000), needBy: String(req.body?.needBy || "").slice(0, 20) });
  res.status(201).json(shape(r));
});

router.get("/mine", requireAuth, async (req, res) => {
  res.json((await Request.find({ user: req.user.id }).sort({ createdAt: -1 })).map(shape));
});

router.get("/", requireRole("admin"), async (req, res) => {
  res.json((await Request.find().sort({ createdAt: -1 }).limit(200)).map(shape));
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  if (!["open", "quoted", "declined"].includes(req.body?.state)) return res.status(400).json({ error: "Invalid state." });
  const r = await Request.findByIdAndUpdate(req.params.id, { state: req.body.state }, { new: true });
  if (!r) return res.status(404).json({ error: "Request not found." });
  res.json(shape(r));
});

module.exports = router;
