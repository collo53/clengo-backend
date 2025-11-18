const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 


async function updateJobStatus(req, res) {

  try {
    const id = req.params.id.trim();
    const { status, notes } = req.body;

    const [job] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!job.length) return res.status(404).json({ success: false, message: 'Job not found' });

    const previousStatus = job[0].status;
    await pool.query('UPDATE job SET status = ?, notes = ?, updatedAt = NOW() WHERE id = ?', [status, notes || null, id]);

    res.status(200).json({ success: true, data: { jobId: id, previousStatus, currentStatus: status }, message: 'Job status updated successfully' });
  } catch (err) {
    console.error('Error updating job status:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}
module.exports ={
    updateJobStatus,
};
