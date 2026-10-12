const router = require("express").Router();
const { PaymentSettings } = require("../models");
const { requireRole } = require("../middleware/auth");

const MAX_IMAGE_BYTES = 1.25 * 1024 * 1024;
const emptyMethod = () => ({ name: "", number: "", qrData: "", enabled: false });

function methodView(method) {
  if (!method) return emptyMethod();
  const name = String(method.name || "");
  const number = String(method.number || "");
  const qrData = String(method.qrData || "");
  return { name, number, qrData, enabled: !!(name && number && qrData) };
}

function validQrData(data) {
  if (typeof data !== "string") return false;
  const match = data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return false;
  if (match[1] === "png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (match[1] === "jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

function publicView(settings) {
  return {
    gcash: methodView(settings?.methods?.gcash),
    paymaya: methodView(settings?.methods?.paymaya)
  };
}

router.get("/", async (req, res) => {
  res.json(publicView(await PaymentSettings.findOne({ key: "default" })));
});

router.put("/", requireRole("admin"), async (req, res) => {
  const methods = req.body?.methods;
  if (!methods || typeof methods !== "object")
    return res.status(400).json({ error: "Payment method settings are required." });

  const normalized = {};
  for (const key of ["gcash", "paymaya"]) {
    const method = methods[key];
    if (!method || typeof method !== "object")
      return res.status(400).json({ error: `Settings for ${key} are required.` });
    const name = typeof method.name === "string" ? method.name.trim() : "";
    const number = typeof method.number === "string" ? method.number.trim() : "";
    const qrData = typeof method.qrData === "string" ? method.qrData : "";
    if (name.length > 80 || number.length > 40)
      return res.status(400).json({ error: `The ${key} account name or number is too long.` });
    if (name || number || qrData) {
      if (!name || !number || !validQrData(qrData))
        return res.status(400).json({ error: `Enter an account name, number, and valid QR image for ${key}.` });
    }
    normalized[key] = { name, number, qrData };
  }

  const settings = await PaymentSettings.findOneAndUpdate(
    { key: "default" },
    { $set: { methods: normalized } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  res.json(publicView(settings));
});

module.exports = router;
