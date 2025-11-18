const multer = require('multer');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const bcrypt = require('bcrypt');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });



async function registerUser(req, res) {
    router.post('/register', upload.single('profilePic'), async (req, res) => {
      try {
        const {
          firstName,
          lastName,
          email,
          password,
          role,
          phone,
          address,
          dob,
          legal,
          notes,
          balance,
          isAvailable,
          Suspended
        
        } = req.body;
    
        if (!firstName || !lastName || !email || !password || !role) {
          return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }
    
        const [existing] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
        if (existing.length > 0) {
          return res.status(409).json({ success: false, message: 'User already exists.' });
        }
    
        const passwordHash = await bcrypt.hash(password, 10);
    
        let profilePicUrl = null;
        if (req.file) {
          profilePicUrl = `/uploads/${req.file.filename}`;
        }
    const [result] = await pool.query(
      `INSERT INTO user 
      (id, email, passwordHash, firstName, lastName, phone, dob, address, profilePicUrl, role, balance, legal, notes,  createdAt, updatedAt, isAvailable, Suspended)
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  NOW(), NOW(),?, ?)`,
      [
        email,
        passwordHash,
        firstName,
        lastName,
        phone || null,
        dob || null,
        address || null,
        profilePicUrl,
        role,
        balance || 0,
        legal ? JSON.stringify(legal) : null,
        notes ? JSON.stringify(notes) : null,
        isAvailable !== undefined ? !!isAvailable : true,  // default true
        Suspended !== undefined ? !!suspended : false       // default false
      ]
    );
    
    
    
        res.status(201).json({
          success: true,
          message: 'User created successfully.',
          user: {
            email,
            firstName,
            lastName,
            role,
            balance: balance || 0,
            profilePicUrl,
            legal,
            notes,
            isAvailable: isAvailable !== undefined ? !!isAvailable : true,
            Suspended: Suspended !== undefined ? !!Suspended : false
    
          },
        });
      } catch (err) {
        console.error(' Registration error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
      }
    });
}

module.exports = {
  registerUser,
};