const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 


async function reverseJob(req, res) {

  try {
    const id = req.params.id.trim();
    const { reason, refundAmount } = req.body;

    const [job] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!job.length) return res.status(404).json({ success: false, message: 'Job not found' });
    if (job[0].status !== 'completed') return res.status(400).json({ success: false, message: 'Only completed jobs can be reversed' });

    await pool.query('UPDATE job SET status = ?, refundAmount = ?, updatedAt = NOW() WHERE id = ?', ['cancelled', refundAmount, id]);

    res.status(200).json({ success: true, data: { jobId: id, previousStatus: 'completed', currentStatus: 'cancelled', refundIssued: true, refundAmount }, message: 'Job reversed successfully' });
  } catch (err) {
    console.error('Error reversing job:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}
module.exports ={
    reverseJob,
};