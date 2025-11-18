const {pool} = require('../config/db');
const express = require('express');
const router = express.Router();


async function getAllUsers(req, res) {
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
}
module.exports = {
  getAllUsers,
};
