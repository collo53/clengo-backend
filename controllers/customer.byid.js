const express = require("express");
const router = express.Router();
const { pool } = require("../config/db"); 


async function getCustomerbyId(req, res) {
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
}
module.exports ={
    getCustomerbyId,
};