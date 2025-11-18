const {pool} = require('../config/db');
const express = require('express');
const router = express.Router();


async function updateUser(req, res) {
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
        console.error(" Error updating user:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
      }
    }
    module.exports = {
      updateUser,
    };