
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 


async function getJobbyId(req, res) {


  try {
    const id = req.params.id.trim();
    const [rows] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error fetching job by ID:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}
module.exports={
    getJobbyId,
};

