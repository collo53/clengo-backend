const {pool} = require('../config/db');
const express = require('express');
const router = express.Router();


async function deleteUser(req, res) {

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
    }
    module.exports = {
      deleteUser,
    }