const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { create } = require('domain');


// MULTER CONFIGURATION for file uploads

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


// REGISTER USER

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



//login

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    // Find user by email
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const storedPassword = user.passwordHash; 

    let isMatch = false;

    if (storedPassword && storedPassword.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, storedPassword);
    } else {
      isMatch = password === storedPassword;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!storedPassword.startsWith('$2')) {
      const newHash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE user SET passwordHash = ? WHERE id = ?', [newHash, user.id]);
      console.log(`Upgraded ${email} password to bcrypt hash`);
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profilePicUrl: user.profilePicUrl,
        isAvailable: user.isAvailable,
        Suspended: user.suspended,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});


router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, firstName, lastName, phone, dob, address, profilePicUrl, 
              role, balance, legal, notes, createdAt, updatedAt, isAvailable, Suspended
       FROM user`
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      users: rows,
    });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: err.message,
    });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id.trim(); // remove whitespace/newlines

    const [rows] = await pool.query(
      `SELECT id, email, firstName, lastName, phone, dob, address, profilePicUrl, 
              role, balance, legal, notes, createdAt, updatedAt, isAvailable, suspended
       FROM user
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: rows[0],
    });
  } catch (err) {
    console.error("❌ Error fetching user by ID:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: err.message,
    });
  }
});

// Update user details
router.put("/update/:id", upload.single("profilePic"), async (req, res) => {
  try {
    let id = req.params.id.trim();
    console.log("Updating user with ID:", id);

    const data = { ...req.body, ...req.query };
    const { firstName, lastName, email, phone, address, dob, role, balance, legal, notes, isAvailable, suspended } = data;

    const [existing] = await pool.query("SELECT * FROM user WHERE id = ?", [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let profilePicUrl = existing[0].profilePicUrl;
    if (req.file) profilePicUrl = `/uploads/${req.file.filename}`;

    const updateFields = [];
    const updateValues = [];

    if (firstName) { updateFields.push("firstName = ?"); updateValues.push(firstName); }
    if (lastName) { updateFields.push("lastName = ?"); updateValues.push(lastName); }
    if (email) { updateFields.push("email = ?"); updateValues.push(email); }
    if (phone) { updateFields.push("phone = ?"); updateValues.push(phone); }
    if (address) { updateFields.push("address = ?"); updateValues.push(address); }
    if (dob) { updateFields.push("dob = ?"); updateValues.push(dob); }
    if (role) { updateFields.push("role = ?"); updateValues.push(role); }
    if (balance !== undefined) { updateFields.push("balance = ?"); updateValues.push(balance); }
    if (legal) { updateFields.push("legal = ?"); updateValues.push(JSON.stringify(legal)); }
    if (notes) { updateFields.push("notes = ?"); updateValues.push(JSON.stringify(notes)); }
    if (isAvailable !== undefined) { updateFields.push("isAvailable = ?"); updateValues.push(!!isAvailable); }
    if (suspended !== undefined) { updateFields.push("suspended = ?"); updateValues.push(!!suspended); }
    if (req.file) { updateFields.push("profilePicUrl = ?"); updateValues.push(profilePicUrl); }

    if (updateFields.length === 0) return res.status(400).json({ success: false, message: "No fields to update" });

    updateFields.push("updatedAt = NOW()");
    const updateQuery = `UPDATE user SET ${updateFields.join(", ")} WHERE id = ?`;
    updateValues.push(id);

    await pool.query(updateQuery, updateValues);

    res.status(200).json({ success: true, message: "User updated successfully" });

  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});



// Delete user by ID
router.delete("/delete/:id", async (req, res) => {
  try {
    let id = req.params.id.trim(); // remove whitespace/newlines
    console.log("Deleting user with ID:", id);

    // Check if the user exists
    const [existing] = await pool.query(
      "SELECT * FROM user WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Delete the user
    await pool.query("DELETE FROM user WHERE id = ?", [id]);

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error(" Error deleting user:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});





module.exports = router;
