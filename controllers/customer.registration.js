const multer = require('multer');
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const bcrypt = require('bcrypt');



async function registerCustomer(req, res) {

  try {
    const { firstName, surname, email, landline, mobile, address, balance } = req.body;

    if (!firstName ) {
      return res.status(400).json({ success: false, message: "First name is required" });
    }

    const [existing] = await pool.query(
      "SELECT * FROM customer WHERE email = ? OR mobile = ?",
      [email, mobile]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Customer already exists" });
    }

    const addressJson = address ? JSON.stringify(address) : null;

    const [result] = await pool.query(
      `INSERT INTO customer 
       (id, firstName, surname, email, landline, mobile, address, balance, createdAt, updatedAt)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [firstName, surname || null, email || null, landline || null, mobile || null, addressJson, balance || 0]
    );

    const [customer] = await pool.query(
      "SELECT * FROM customer WHERE id = (SELECT id FROM customer ORDER BY createdAt DESC LIMIT 1)"
    );

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer: customer[0] || null, 
    });
  } catch (err) {
    console.error(" Error registering customer:", err);
    res.status(500).json({
      success: false,
      message: "Server error while creating customer",
      error: err.message,
    });
  }
}

module.exports ={
    registerCustomer,
};


