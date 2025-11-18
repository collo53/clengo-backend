const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 



async function updateJob(req, res) {

  try {
    const id = req.params.id.trim();
    const data = req.body;

    const [existing] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Job not found' });

    const fields = [];
    const values = [];
    for (const key in data) if (data[key] !== undefined) fields.push(`${key} = ?`), values.push(data[key]);

    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    fields.push('updatedAt = NOW()');
    values.push(id);

    await pool.query(`UPDATE job SET ${fields.join(', ')} WHERE id = ?`, values);
    res.status(200).json({ success: true, data, message: 'Job updated successfully' });
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}

module.exports={
    updateJob,
};