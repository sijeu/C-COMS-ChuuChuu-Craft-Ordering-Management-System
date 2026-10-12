const jwt = require("jsonwebtoken");

function parse(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET); } catch (e) { return null; }
}

exports.optionalAuth = (req, res, next) => { req.user = parse(req); next(); };

exports.requireAuth = (req, res, next) => {
  const u = parse(req);
  if (!u) return res.status(401).json({ error: "Please log in." });
  req.user = u; next();
};

exports.requireRole = role => (req, res, next) => {
  const u = parse(req);
  if (!u) return res.status(401).json({ error: "Please log in." });
  if (u.role !== role) return res.status(403).json({ error: "Not allowed." });
  req.user = u; next();
};
