const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to sign JWT
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check duplicate email
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered. Please login or use another email.'
      });
    }

    // Generate unique username from email
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'traveler';
    const uniqueUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `INSERT INTO users (username, name, email, password, role) VALUES (?, ?, ?, ?, 'USER')`,
      [uniqueUsername, name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    const newUserId = result.insertId;
    const token = generateToken(newUserId, 'USER');

    // Create a welcome notification
    await db.execute(
      `INSERT INTO notifications (user_id, title, message, type) 
       VALUES (?, ?, ?, 'system')`,
      [
        newUserId,
        'Welcome to Travel Planner! 🎒',
        'Start planning your first journey by clicking "+ Plan a Trip". Enjoy exploring the world!'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome aboard.',
      data: {
        token,
        user: {
          id: newUserId,
          username: uniqueUsername,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: 'USER',
          avatar: null
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email (or username) and password.'
      });
    }

    // Allow login with either email or username (useful for admin username 'zahraf')
    const [users] = await db.execute(
      'SELECT id, username, name, email, password, role, avatar, is_active FROM users WHERE email = ? OR username = ?',
      [email.toLowerCase().trim(), email.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact support.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.'
      });
    }

    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (users.length === 0) {
      // Don't leak registered status for security, but return confirmation
      return res.json({
        success: true,
        message: 'If that email exists in our system, password reset instructions have been issued.'
      });
    }

    // Generate random 6-digit reset code
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await db.execute(
      'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?',
      [resetToken, expires, users[0].id]
    );

    // Also add notification for test convenience
    await db.execute(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'system')`,
      [users[0].id, 'Password Reset Code', `Your reset code is: ${resetToken}`, 'system']
    );

    res.json({
      success: true,
      message: 'Password reset code generated. In development, check notifications or use token.',
      data: { resetToken } // sent for developer ease in university/local demo
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset token, and new password are required.'
      });
    }

    const [users] = await db.execute(
      'SELECT id, reset_password_expires FROM users WHERE email = ? AND reset_password_token = ?',
      [email.toLowerCase().trim(), resetToken]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code or email.'
      });
    }

    const user = users[0];
    if (new Date(user.reset_password_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute(
      'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.'
    });
  } catch (err) {
    next(err);
  }
};
