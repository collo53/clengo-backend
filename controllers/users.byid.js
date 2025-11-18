const {pool} = require('../config/db');
const express = require('express');
const router = express.Router();


async function getUserbyId(req, res) {
      try {
        const id = req.params.id.trim(); 
    
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
        console.error(" Error fetching user by ID:", err);
        res.status(500).json({
          success: false,
          message: "Error fetching user",
          error: err.message,
        });
      }
    }

    module.exports = {
      getUserbyId,
    };
