
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 
;

async function assignCleaner(req, res) {

  try {
    const id = req.params.id.trim();
    const { cleanerId, makePrimary, note } = req.body;

    const [job] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!job.length) return res.status(404).json({ success: false, message: 'Job not found' });

    await pool.query('UPDATE job SET assigned = ?, updatedAt = NOW() WHERE id = ?', [cleanerId, id]);

    res.status(200).json({
      success: true,
      data: { jobId: id, status: job[0].status, assignedTo: { cleanerId, primary: !!makePrimary, note } },
      message: 'Cleaner assigned successfully'
    });
  } catch (err) {
    console.error('Error assigning cleaner:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}
module.exports={
    assignCleaner,
};
