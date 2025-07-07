const jwt = require('jsonwebtoken');
const { database } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token is blacklisted
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');
    const blacklistedToken = await database.get(
      'SELECT id FROM user_sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP',
      [hashedToken]
    );

    if (blacklistedToken) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Verify user still exists
    const user = await database.get(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

async function revokeToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const hashedToken = require('crypto').createHash('sha256').update(token).digest('hex');
    
    await database.run(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [decoded.id, hashedToken, new Date(decoded.exp * 1000).toISOString()]
    );
  } catch (error) {
    console.error('Error revoking token:', error);
    throw error;
  }
}

// Cleanup expired tokens periodically
setInterval(async () => {
  try {
    await database.run(
      'DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP'
    );
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
}, 60 * 60 * 1000); // Run every hour

module.exports = {
  generateToken,
  authenticateToken,
  revokeToken
};