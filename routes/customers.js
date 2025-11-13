const express = require("express");
const router = express.Router();
const { pool } = require("../config/db"); 
const { get } = require("./users");

// REGISTER NEW CUSTOMER


router.post("/register", async (req, res) => {
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
});


//get customers list

router.get("/getcustomers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, firstName, surname, email, landline,mobile, address, balance, createdAt, updatedAt
       FROM customer`
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      users: rows,
    });
  } catch (err) {
    console.error(" Error fetching customers:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: err.message,
    });
  }
});



// Get customer by ID
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id.trim(); 

    const [rows] = await pool.query(
      `SELECT id, firstName, surname, email, landline,mobile, address, balance, createdAt, updatedAt

       FROM customer
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      user: rows[0],
    });
  } catch (err) {
    console.error(" Error fetching customer by ID:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching Customer",
      error: err.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    let id = req.params.id.trim(); 
    console.log("Deleting customer with ID:", id);

    const [existing] = await pool.query(
      "SELECT * FROM customer WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await pool.query("DELETE FROM customer WHERE id = ?", [id]);

    res.status(200).json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    console.error(" Error deleting customer:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});




module.exports = router;
