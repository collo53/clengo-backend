const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
const bcrypt = require('bcrypt');



async function getCustomer(req, res) {

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
}
module.exports ={
    getCustomer,
};
