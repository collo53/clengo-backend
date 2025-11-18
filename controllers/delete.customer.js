
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db"); 

async function deleteCustomer(req, res) {

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
}

module.exports ={
    deleteCustomer,
};