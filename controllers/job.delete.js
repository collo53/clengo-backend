
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db'); 


async function deleteJob(req, res) {

  try {
    const id = req.params.id.trim();
    const { cancel, reason } = req.query;

    const [existing] = await pool.query('SELECT * FROM job WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Job not found' });

    if (cancel === 'true') {
      await pool.query('UPDATE job SET status = ?, cancelReason = ?, updatedAt = NOW() WHERE id = ?', ['cancelled', reason || null, id]);
      return res.status(200).json({ success: true, data: { jobID: existing[0].jobID, status: 'cancelled' }, message: 'Job cancelled successfully' });
    }

    await pool.query('DELETE FROM job WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
}
module.exports ={
    deleteJob,
};
