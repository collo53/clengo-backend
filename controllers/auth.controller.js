const bcrypt = require('bcrypt');
const { pool } = require('../config/db'); 
const jwt = require('jsonwebtoken');
const JWT_SECRET="bc78717fa8f545e181b03ec042938d5b0497478b2eccd33c39db57c15d94e302";
const JWT_EXPIRES_IN="30d";



async function loginAdmin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const query = `
      SELECT 
        id,
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        phone,
        isAvailable,
        suspended,
        balance,
        profilePicUrl,
        updatedAt
      FROM user
      WHERE email = ?
      LIMIT 1;
    `;

  const [rows] = await pool.query(query, [email]);
const user = rows[0];

if (!user) {
  return res.status(401).json({
    success: false,
    message: 'Invalid email or password',
  });
}


    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin account required.',
      });
    }

    if (user.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Contact support.',
      });
    }

    // FIXED password field name
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

  const token = jwt.sign(
  tokenPayload,
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);


    // FIXED field mappings
    const responseUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isAvailable: user.isAvailable,
      suspended: user.suspended,
      balance: Number(user.balance || 0),
      profilePicUrl: user.profilePicUrl,
      updatedAt: user.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: responseUser,
    });

  } catch (err) {
    console.error('Error in loginAdmin:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to login. Please try again.',
    });
  }
}
  module.exports = {
  loginAdmin,
};