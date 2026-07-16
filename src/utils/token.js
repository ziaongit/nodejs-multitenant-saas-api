const jwt = require('jsonwebtoken');

function generateToken({ userId, tenantId, email, role }) {
  return jwt.sign(
    { userId, tenantId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
