const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "12h";

// This service's own auth - deliberately not sharing Accura's session
// tokens. "Shares Accura's tokens and components" in the plan means
// design tokens (the theme/colors/type-scale), not auth tokens: a POS
// vendor's field team must never be able to log into Accura's books with
// the same credentials, and vice versa.
function signToken(user) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    { sub: user.id, org_id: user.org_id, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.verify(token, JWT_SECRET);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    req.user = verifyToken(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of: ${roles.join(", ")}` });
    }
    next();
  };
}

module.exports = { signToken, verifyToken, hashPassword, checkPassword, requireAuth, requireRole };
